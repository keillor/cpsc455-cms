import argon2 from 'argon2'

for (const passwd of process.argv.slice(2)) {
  const hash = await argon2.hash(passwd, {
    secret: Buffer.from(process.env.SECRET)
  })

  console.log(passwd, hash)
}
