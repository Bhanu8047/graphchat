import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AppUser, AuthenticatedUser } from '@graphchat/shared-types';
import { PasswordService } from '../common/auth/password.service';
import { UsersRepository } from './users.repository';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly users: UsersRepository,
    private readonly passwords: PasswordService,
  ) {}

  toPublicUser(user: AppUser | null | undefined): AuthenticatedUser | null {
    if (!user) return null;
    const {
      id,
      email,
      name,
      authProvider,
      githubId,
      githubLogin,
      avatarUrl,
      createdAt,
      updatedAt,
    } = user;
    return {
      id,
      email,
      name,
      authProvider,
      themePreference: user.themePreference ?? 'system',
      role: user.role ?? 'user',
      githubId,
      githubLogin,
      avatarUrl,
      createdAt,
      updatedAt,
    };
  }

  findPublicById(id: string) {
    return this.users.findById(id).then((user) => this.toPublicUser(user));
  }

  async updateCurrentUser(
    userId: string,
    dto: UpdateUserDto,
  ): Promise<AuthenticatedUser> {
    const existing = await this.users.findById(userId);
    if (!existing) throw new NotFoundException('User not found.');

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.users.findByEmail(dto.email);
      if (emailTaken && emailTaken.id !== existing.id) {
        throw new ConflictException('Email is already in use.');
      }
    }

    let passwordHash = existing.passwordHash;
    if (dto.newPassword) {
      if (!existing.passwordHash) {
        throw new UnauthorizedException(
          'This account does not support password updates.',
        );
      }

      if (
        !dto.currentPassword ||
        !this.passwords.verify(dto.currentPassword, existing.passwordHash)
      ) {
        throw new UnauthorizedException('Current password is incorrect.');
      }

      passwordHash = this.passwords.hash(dto.newPassword);
    }

    const updated = await this.users.update(userId, {
      name: dto.name ?? existing.name,
      email: dto.email ?? existing.email,
      themePreference:
        dto.themePreference ?? existing.themePreference ?? 'system',
      passwordHash,
    });

    if (!updated) throw new NotFoundException('User not found.');
    return this.toPublicUser(updated)!;
  }

  async deleteCurrentUser(userId: string): Promise<void> {
    await this.users.delete(userId);
  }
}
