import { HttpException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  CallType,
  CredentialKind,
  ModelService,
  ModelUsageRecord,
  ModelUsageSummary,
  UsageRecord,
} from '@graphchat/shared-types';
import { ModelQuotasService } from '../model-quotas/model-quotas.service';
import { UsageRepository } from './usage.repository';

const todayUTC = () => new Date().toISOString().slice(0, 10);

interface CheckAndRecordOpts {
  userId: string;
  provider: CredentialKind;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  callType?: CallType;
  /**
   * Set to true on the pre-call insert when outputTokens is unknown — applies
   * a 1.5x multiplier on input as a conservative output estimate so a large
   * response can't slip under a near-cap budget.
   */
  estimateOutput?: boolean;
}

interface CheckAndRecordResult {
  allowed: true;
  recordId: string;
  estimatedUsdCost: number;
  remainingUsd: number;
}

const PROVIDER_LOCAL: CredentialKind = 'ollama';

@Injectable()
export class UsageService {
  constructor(
    private readonly repo: UsageRepository,
    private readonly quotas: ModelQuotasService,
  ) {}

  /** Legacy daily-count record. Untouched. */
  record(
    userId: string,
    service: ModelService,
    provider: CredentialKind,
    model: string,
    tokens = 0,
  ) {
    return this.repo.increment({
      userId,
      service,
      provider,
      model: model || 'unknown',
      day: todayUTC(),
      count: 1,
      tokens,
    });
  }

  countToday(userId: string, service: ModelService) {
    return this.repo.countToday(userId, service, todayUTC());
  }

  countLastHour(userId: string, service: ModelService) {
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    return this.repo.countSince(userId, service, since);
  }

  listForUser(userId: string): Promise<UsageRecord[]> {
    return this.repo.listForUser(userId);
  }

  listAll(): Promise<UsageRecord[]> {
    return this.repo.listAll();
  }

  // ── Cost-based quota tracking ────────────────────────────────────────────

  /**
   * Pre-call check: throws 429 if this call would put the user over the cap
   * for (provider, modelId) in the current calendar month. Otherwise inserts
   * a ModelUsage row with estimated cost and returns its id. Provider 'ollama'
   * (treated as local/free) bypasses quota entirely.
   */
  async checkAndRecord(
    opts: CheckAndRecordOpts,
  ): Promise<CheckAndRecordResult | { allowed: true; bypassed: true }> {
    if (opts.provider === PROVIDER_LOCAL) {
      return { allowed: true, bypassed: true };
    }

    const quota = await this.quotas.findByProviderModel(
      opts.provider,
      opts.modelId,
    );
    if (!quota) {
      throw new HttpException(
        `No quota configured for ${opts.provider}/${opts.modelId}.`,
        403,
      );
    }
    if (quota.isActive === false) {
      throw new HttpException(`Model ${opts.modelId} is disabled.`, 403);
    }

    const inputTokens = Math.max(0, Math.floor(opts.inputTokens));
    const reportedOutput = Math.max(0, Math.floor(opts.outputTokens));
    const effectiveOutputForEstimate = opts.estimateOutput
      ? Math.max(reportedOutput, Math.ceil(inputTokens * 1.5))
      : reportedOutput;

    const estimatedUsdCost = this.computeCost(
      inputTokens + effectiveOutputForEstimate,
      quota.costPer1kTokens,
    );
    const limit = this.quotas.effectiveLimit(quota);
    const { startIso, endIso } = currentMonthBoundsUTC();
    const usedSoFar = await this.repo.sumMonthlyCost(
      opts.userId,
      opts.provider,
      opts.modelId,
      startIso,
      endIso,
    );

    if (usedSoFar + estimatedUsdCost > limit) {
      const resetOn = new Date(endIso).toISOString().slice(0, 10);
      throw new HttpException(
        `Monthly limit reached for ${opts.modelId}. Resets on ${resetOn}.`,
        429,
      );
    }

    const recordId = randomUUID();
    const now = new Date().toISOString();
    const record: ModelUsageRecord = {
      id: recordId,
      userId: opts.userId,
      provider: opts.provider,
      modelId: opts.modelId,
      callType: opts.callType ?? 'inference',
      inputTokens,
      outputTokens: reportedOutput,
      estimatedUsdCost,
      createdAt: now,
    };
    await this.repo.insertModelUsage(record);
    return {
      allowed: true,
      recordId,
      estimatedUsdCost,
      remainingUsd: Math.max(0, limit - (usedSoFar + estimatedUsdCost)),
    };
  }

  /**
   * Insert-only path for embeddings (per spec: single ModelUsage insert,
   * inputTokens from response, no pre-call gate). Provider 'ollama' and
   * unknown quotas are silently skipped — the call already happened.
   */
  async recordModelUsage(opts: {
    userId: string;
    provider: CredentialKind;
    modelId: string;
    inputTokens: number;
    outputTokens?: number;
    callType?: CallType;
  }) {
    if (opts.provider === PROVIDER_LOCAL) return;
    const quota = await this.quotas.findByProviderModel(
      opts.provider,
      opts.modelId,
    );
    if (!quota) return;
    const inputTokens = Math.max(0, Math.floor(opts.inputTokens));
    const outputTokens = Math.max(0, Math.floor(opts.outputTokens ?? 0));
    const estimatedUsdCost = this.computeCost(
      inputTokens + outputTokens,
      quota.costPer1kTokens,
    );
    const record: ModelUsageRecord = {
      id: randomUUID(),
      userId: opts.userId,
      provider: opts.provider,
      modelId: opts.modelId,
      callType: opts.callType ?? 'embedding',
      inputTokens,
      outputTokens,
      estimatedUsdCost,
      createdAt: new Date().toISOString(),
    };
    await this.repo.insertModelUsage(record);
  }

  /**
   * Post-call reconciliation: replace the estimate with the SDK-reported
   * actuals. Cost is recomputed from the original quota row.
   */
  async updateActuals(
    recordId: string,
    provider: CredentialKind,
    modelId: string,
    inputTokens: number,
    outputTokens: number,
  ) {
    if (provider === PROVIDER_LOCAL) return;
    const quota = await this.quotas.findByProviderModel(provider, modelId);
    if (!quota) return;
    const total =
      Math.max(0, Math.floor(inputTokens)) +
      Math.max(0, Math.floor(outputTokens));
    const estimatedUsdCost = this.computeCost(total, quota.costPer1kTokens);
    await this.repo.updateModelUsage(recordId, {
      inputTokens: Math.max(0, Math.floor(inputTokens)),
      outputTokens: Math.max(0, Math.floor(outputTokens)),
      estimatedUsdCost,
    });
  }

  /** Per-model summary for the current calendar month. */
  async getModelUsageSummary(userId: string): Promise<ModelUsageSummary[]> {
    const { startIso, endIso } = currentMonthBoundsUTC();
    const [breakdown, quotas] = await Promise.all([
      this.repo.modelUsageBreakdown(userId, startIso, endIso),
      this.quotas.list(),
    ]);
    const usedByKey = new Map(
      breakdown.map((row) => [`${row._id.provider}:${row._id.modelId}`, row]),
    );

    return quotas.map((q) => {
      const row = usedByKey.get(`${q.provider}:${q.modelId}`);
      const usedUsd = row?.usedUsd ?? 0;
      const limitUsd = this.quotas.effectiveLimit(q);
      return {
        provider: q.provider,
        modelId: q.modelId,
        callType: inferCallType(q.modelId),
        usedUsd,
        limitUsd,
        remainingUsd: Math.max(0, limitUsd - usedUsd),
        inputTokens: row?.inputTokens ?? 0,
        outputTokens: row?.outputTokens ?? 0,
        callCount: row?.callCount ?? 0,
        monthStart: startIso,
        monthEnd: endIso,
      };
    });
  }

  /**
   * Admin-side aggregation across all users. Filters: userId, provider, month
   * (YYYY-MM). Month interpreted as UTC calendar month.
   */
  async aggregateModelUsage(filter: {
    userId?: string;
    provider?: CredentialKind;
    month?: string;
  }) {
    const range = filter.month ? monthBoundsUTC(filter.month) : undefined;
    return this.repo.modelUsageAggregate({
      userId: filter.userId,
      provider: filter.provider,
      monthStartIso: range?.startIso,
      monthEndIso: range?.endIso,
    });
  }

  private computeCost(totalTokens: number, costPer1k: number): number {
    return roundUsd((totalTokens / 1000) * costPer1k);
  }
}

function currentMonthBoundsUTC(): { startIso: string; endIso: string } {
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0),
  );
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function monthBoundsUTC(yyyymm: string): { startIso: string; endIso: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(yyyymm);
  if (!match) {
    throw new HttpException(
      `Invalid month "${yyyymm}". Expected YYYY-MM.`,
      400,
    );
  }
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function roundUsd(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

function inferCallType(modelId: string): CallType {
  return /embed/i.test(modelId) || /voyage/i.test(modelId)
    ? 'embedding'
    : 'inference';
}
