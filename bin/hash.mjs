#!/usr/bin/env node

import argon2 from 'argon2'

const SECRET = 'cpsc455-cms'

for (const passwd of process.argv.slice(2)) {
  const hash = await argon2.hash(passwd, {
    secret: Buffer.from(SECRET)
  })

  console.log(passwd, hash)
}