CREATE TABLE roles(
    id INTEGER PRIMARY KEY,
    name VARCHAR
);

CREATE TABLE users(
    id INTEGER PRIMARY KEY,
    role_id INTEGER NOT NULL REFERENCES roles(id),
    username VARCHAR UNIQUE,
    password VARCHAR
);

CREATE TABLE articles(
    id INTEGER PRIMARY KEY,
    author_id INTEGER NOT NULL REFERENCES users(id),
    title VARCHAR,
    body VARCHAR,
    dateline DATE DEFAULT CURRENT_TIMESTAMP,
    published BOOLEAN DEFAULT FALSE
);

INSERT INTO roles(id, name) VALUES(1, 'reader');
INSERT INTO roles(id, name) VALUES(2, 'writer');
INSERT INTO roles(id, name) VALUES(3, 'editor');

INSERT INTO users(id, role_id, username, password) -- 'aaa'
VALUES(1, 1, 'alice', '$argon2id$v=19$m=65536,t=3,p=4$qDZGxl6Y5ISF0wBg08FjNg$9EpVVm21NLFVfqiaROCbcJxmyEl9mdbHfRtm6t4UeX4');
INSERT INTO users(id, role_id, username, password) -- 'bbb'
VALUES(2, 2, 'bob', '$argon2id$v=19$m=65536,t=3,p=4$Tsce/ZWuBIlR7yAPS/Cbig$SNxoLn/XaZGuSDKaNZApaaXjrAOAC8mRvRjNv1FXnWs');
INSERT INTO users(id, role_id, username, password) -- 'ccc'
VALUES(3, 2, 'carol', '$argon2id$v=19$m=65536,t=3,p=4$0dn/4Uw+JQE8dLDuctfORg$WUzM/eRLhaicVOh8RuSI2rb1XTDthwaWQhUtCZ3Qc8o');
INSERT INTO users(id, role_id, username, password) -- 'ddd'
VALUES(4, 3, 'dan', '$argon2id$v=19$m=65536,t=3,p=4$rDanPLe0DlQKM5ZzgN0WpA$qILKaxH53MKIj14cw03GUlP5NuYgnNpswsU38pnyfTo');

-- http://www.catipsum.com
INSERT INTO articles(author_id, title, body, published)
VALUES(
    2,
    'Annoy owner until he gives you food', 
    'Eat owner''s food i love cuddles, ooh, are those your $250 dollar sandals?',
    TRUE
);

INSERT INTO articles(author_id, title, body, published)
VALUES(
    3,
    'No, you can''t close the door, i haven''t decided whether or not i wanna go out',
    'i can haz prance along on top of the garden fence, annoy the neighbor''s dog and make it bark.',
    TRUE
);

INSERT INTO articles(author_id, title, body)
VALUES(
    3,
    'Meeeeouw have my breakfast spaghetti yarn',
    'Check cat door for ambush 10 times before coming in eat all the power cords run around the house at 4 in the morning.'
);
