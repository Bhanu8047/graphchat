#!/usr/bin/env node
/* Smoke test: run the local extractor against this repo and print stats. */
const { extractRepo } = require('../dist/lib/extract/index.js');

const start = Date.now();
extractRepo({ repoPath: process.argv[2] || '.', repoId: 'smoke-test' })
  .then((r) => {
    const ms = Date.now() - start;
    const byType = {};
    for (const n of r.nodes) byType[n.type] = (byType[n.type] || 0) + 1;
    console.log(JSON.stringify(
      {
        ms,
        filesScanned: r.filesScanned,
        filesParsed: r.filesParsed,
        filesSkipped: r.filesSkipped,
        bytesScanned: r.bytesScanned,
        nodes: r.nodes.length,
        edges: r.edges.length,
        byType,
        sampleNode: r.nodes[0],
        sampleEdge: r.edges[0],
      },
      null,
      2,
    ));
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
