const fs = require("fs")
const os = require("os")
const express = require("express")
const morgan = require("morgan")
const Database = require("better-sqlite3")
const argon2 = require("argon2")
const { parse } = require("path")


const app = express()
app.use(morgan("dev"))
app.use(express.static('static'))
app.use(express.json())

const db = new Database(process.env.DB_FILE, {
  verbose: (sql) => console.log(sql.trim().replace(/\s+/g, ' '))
})
db.pragma('foreign_keys = ON')

function checkPassword(password, hash) {
  return argon2.verify(hash, password)
}

function getUserInfo(username) {
  const stmt = db.prepare(`
    SELECT
      users.id as user_id, roles.name as role
    FROM
      users, roles
    WHERE username = :username
      AND users.role_id = roles.id
  `)
  return stmt.get({ username })
}

app.get('/', (req, res) => {
  res.redirect('/content.html')
})

app.get('/articles/published', (req, res) => {
  const stmt = db.prepare(`
    SELECT
      articles.id, username as author, title, body, dateline
    FROM
      users, articles
    WHERE articles.published = TRUE
      AND users.id = articles.author_id
    ORDER BY
      dateline DESC
  `)
  res.json(stmt.all())
})

app.get('/articles/unpublished', (req, res) => {
  const stmt = db.prepare(`
    SELECT
      articles.id, username as author, title, body, dateline
    FROM
      users, articles
    WHERE articles.published = FALSE
      AND users.id = articles.author_id
    ORDER BY
      dateline DESC
  `)
  res.json(stmt.all())
})

app.post('/articles', (req, res) => {
  const { user_id, role } = getUserInfo(req.body.username)

  const stmt = db.prepare(`
    INSERT INTO articles(author_id, title, body)
    VALUES(:user_id, :title, :body)
  `)
  const info = stmt.run({ ...req.body, user_id })

  res.json({
    id: info.lastInsertRowid,
    ...req.body
  })
})

app.get('/articles/unpublished/:username', (req, res) => {
  const { user_id, role } = getUserInfo(req.params.username)

  const stmt = db.prepare(`
    SELECT
      id, title, body, dateline
    FROM
      articles
    WHERE published = FALSE
      AND author_id = :user_id
    ORDER BY
      dateline ASC
  `)
  res.json(stmt.all({ user_id }))
})

app.patch('/articles/:article_id', (req, res) => {
  const article_id = parseInt(req.params.article_id, 10)
  const published = req.body.published === 'true' ? 1 : 0

  let stmt = db.prepare(`
    UPDATE
      articles
    SET
      published = :published
    WHERE
      id = :article_id
  `)
  stmt.run({ article_id, published })

  stmt = db.prepare(`
    SELECT
      articles.id, username as author, title, body, dateline, published
    FROM
      users, articles
    WHERE articles.id = :article_id
      AND users.id = articles.author_id
  `)
  res.json(stmt.get({ article_id }))
})

app.listen(process.env.PORT, () => {
  const stmt = db.prepare(`
    SELECT 1
    FROM sqlite_master
    WHERE type = 'table'
      AND name = 'users'
  `)
  const exists = stmt.get()

  if (!exists) {
    const setup = fs.readFileSync(process.env.DB_SQL, { encoding: 'utf-8' })
    db.exec(setup)
  }

  console.log(`Server running at http://${os.hostname()}:${process.env.PORT}/`)
})
