// Unless explicitly stated otherwise all files in this repository are licensed under the Apache-2.0 License.
// This product includes software developed at Datadog (https://www.datadoghq.com/) Copyright 2026 Datadog, Inc.

import bcrypt from 'bcryptjs';
import pool from './pool.js';

async function seed() {
  const client = await pool.connect();
  try {
    const adminHash = await bcrypt.hash('admin123', 10);
    const userHash = await bcrypt.hash('user123', 10);
    const editorHash = await bcrypt.hash('editor123', 10);

    await client.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES
         ('admin@portal.local', $1, 'Admin User', 'admin'),
         ('editor@portal.local', $2, 'Editor User', 'editor'),
         ('viewer@portal.local', $3, 'Viewer User', 'viewer')
       ON CONFLICT (email) DO NOTHING`,
      [adminHash, editorHash, userHash]
    );

    console.log('Seed data inserted.');
    console.log('  admin@portal.local  / admin123  (admin)');
    console.log('  editor@portal.local / editor123 (editor)');
    console.log('  viewer@portal.local / viewer123 (viewer)');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
