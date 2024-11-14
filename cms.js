const fs = require("fs")
const os = require("os")
const express = require("express")
const morgan = require("morgan")
const Database = require("better-sqlite3")
const argon2 = require("argon2")
var jwt = require('jsonwebtoken')
const { parse } = require("path")
require('dotenv').config()
var cookieParser = require('cookie-parser')

const app = express()
app.use(morgan("dev"))
app.use(express.static('static'))
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({ extended: true })); // Parses form submissions

const db = new Database(process.env.DB_FILE, {
  verbose: (sql) => console.log(sql.trim().replace(/\s+/g, ' '))
})
db.pragma('foreign_keys = ON')

function checkPassword(password, hash) {
  return argon2.verify(hash, password, {
    secret: Buffer.from(process.env.SECRET)
  })
}

function error401(res) {
  res.status(401).send("<h1>🚨💀 ERROR 401: Unauthorized 💀🚨</h1>\n👀💳 Excuse me, but who do you think you are⁉️ Trying to access this page without proper credentials⁉️ 💢")
}

function error403(res) {
  res.status(403).send('<h1>🛑 403: ACCESS FORBIDDEN 🛑</h1>\nHold up! 🖐️ You thought you had the right permissions? 😂 That’s cute. Access to this page? BLOCKED. 🚫🚫 Guess this isn’t the VIP section you thought it was. 💁✨');
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

const authVerify = function(req, res, next) {
  //grab jwt from cookie
  userJWT = req.cookies['jwt'];
  if(!userJWT) {
    //no jwt present
    //error code message generated from chatGPT
    error401(res);
    return;
  }

  //verify jwt
  var decoded = null
  try {
    decoded = jwt.verify(userJWT, process.env.SECRET)
  } catch (err) {
    console.log(err);
    //error code message generated from chatGPT
    res.status(401).send('<h1>🍂 EXPIRED JWT ALERT 🍂</h1> \nWell, this token is deader than last week’s leftovers 😵🍲. It used to work, but now it\'s just... not. Go get a new JWT, friend, \'cause this one’s been kicked to the curb 🗑️👋.')
    return;
  }
  //check if user has permision to do said thing
  path = req.path
  if(path == '/articles/unpublished') {
    if(decoded['user']['role'] == 'editor' || decoded['user']['role'] == 'writer') {
      res.locals.user = decoded['user'];
      next()
      return;
    }
  } else if (path == '/articles') {
    if(decoded['user']['role'] == 'writer') {
      res.locals.user = decoded;
      next()
      return;
    }
  } else if (path == '/articles/unpublished') {
    if (decoded['user']['role'] == 'writer' || decoded['user']['role'] == 'editor') {
      next()
      return;
    }
  } else if (/\/articles\/\d+\//.test(path)) {
    if (decoded['user']['role'] == 'editor') {
      console.log('dan is an editor')
      next()
      return;
    }
  }
  res.status(403).send('<h1>🛑 403: ACCESS FORBIDDEN 🛑</h1>\nHold up! 🖐️ You thought you had the right permissions? 😂 That’s cute. Access to this page? BLOCKED. 🚫🚫 Guess this isn’t the VIP section you thought it was. 💁✨');
}

app.get('/', (req, res) => {
  res.redirect('/content.html')
})

app.post('/authenticate', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const stmt = db.prepare(`
    SELECT password
    FROM users
    WHERE username = :username
    `);
  
  hash = stmt.all({username});
  stored_hash = hash[0]['password']
  if(!await checkPassword(password, stored_hash)) {
    //error code message generated from chatGPT
    res.status(403).send('<h1>🛑 403: ACCESS FORBIDDEN 🛑</h1>\nHold up! 🖐️ You thought you had the right permissions? 😂 That’s cute. Access to this page? BLOCKED. 🚫🚫 Guess this isn’t the VIP section you thought it was. 💁✨');
    return;
  }

  //check user permissions
  const userPerms = getUserInfo(username);
  if(!userPerms) {
    //user is authentic but has no permissions. No token will be issued.
    //error code message generated from chatGPT
    res.status(404).send('<h1>😔🤷🟪 You have no permissions yet 🟪🤷😔</h1> \n Please contact your administrator');
    return;
  }
  userPerms['username'] = username;

  //create JWT
  var token = jwt.sign({ 
    user: userPerms,
    exp: Math.floor(Date.now() / 1000) + (60 * 20) //20 mins
   }, process.env.SECRET);

  //send jwt as cookie
  res.cookie('jwt', token, {
    path: '/',
    sameSite: 'lax',
    secure: true,
    httpOnly: true,
    maxAge: (60000 * 20),
  })

  //send the user to the home page now that they have the jwt.
  res.json({token});
})

app.get('/articles/published', (req, res) => {
  //view all published articles. No auth required.
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

app.get('/articles/unpublished', authVerify, (req, res) => {
  //if editor, return all articles
  //if writer, return writers articles
  const user = res.locals.user
  const userRole = res.locals.user['role']
  const user_id = res.locals.user['user_id']
  console.log(user);
  
  const stmt = db.prepare(`
    SELECT
      articles.id, username as author, title, body, dateline
    FROM
      users, articles
    WHERE articles.published = FALSE
      AND users.id = articles.author_id
      ${userRole == 'writer' ? 'AND articles.author_id = :user_id' : ''}
    ORDER BY
      dateline DESC
  `)
  res.json(stmt.all({user_id}));
})

app.post('/articles', authVerify, (req, res) => {
  //writer only
  //this upload an article
  user_id = res.locals.user['user']['user_id']
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

/* app.get('/articles/unpublished/:username', (req, res) => {
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
}) */

app.patch('/articles/:article_id', authVerify, (req, res) => {
  console.log(req.path)
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
