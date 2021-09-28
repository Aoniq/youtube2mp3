const express = require('express')
const app = express()
var session = require('express-session');
var mysql = require('mysql');
const bcrypt = require("bcrypt");
let ytdl = require("ytdl-core")
let flush = require("connect-flash")
const { request, response, text } = require('express');

var connection = mysql.createConnection({
	host     : 'localhost',
	user     : 'root',
	password : '',
	database : 'aoniq'
});
app.use(express.json())
app.set('view engine', 'ejs')
app.use("/styles", express.static(__dirname + '/styles'));
app.use("/bootstrap", express.static(__dirname + '/bootstrap'));
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(express.urlencoded({ extended: false }))
app.use(flush())

app.get("/videoinfo", async function(req, res) {
    let videoURL = req.query.videoURL;
    let info = await ytdl.getInfo(videoURL)
    res.status(200).json(info)
})

app.get("/download", function (req, res) {
    let videoURL = req.query.videoURL;
    let itag = req.query.itag;
    let filename = req.query.filename;
    res.setHeader("Content-Disposition", 'attachment;\ filename="'+filename+'"')
    ytdl(videoURL, {
        filter: format => format.itag == itag
    }).pipe(res)
    connection.query(`SELECT * FROM data`, [], async(error, row) => {
      newdownloads = parseInt(row[0].downloads + 1)
    connection.query(`UPDATE data SET downloads = '${newdownloads}'`)
    })
})

app.get('/', async (req, res) => {
  res.render('index')
})

app.get('/login', async (req, res) => {
  res.render('login')
})

app.get('/dashboard', async (req, res) => {
  connection.query(`SELECT * FROM data`, [], async(error, row) => {
    var data = row[0];
    console.log(row[0].downloads)
    const user = req.session;
    if (req.session.loggedin) {
      if (req.session.dashboard) {
        res.render('admin', { user: user, message : req.flash('message')})
      } else {
        res.render('dashboard', { user: user, downloads: row[0].downloads })
      }
    } else {
      res.redirect('/')
      console.log(`user tried to go to dashboard without logging in`)
    }
  })
})

app.post('/auth', async (request, response) => {
	var username = request.body.username;
	var password = request.body.password;
	if (username && password) {
		connection.query('SELECT * FROM users WHERE user = ?', [username], async(error, rows) => {
      let validPass = await bcrypt.compare(password, rows[0].password);

      
			if (rows.length > 0) {
				if (validPass){
          request.session.loggedin = true;
          request.session.username = username;
          request.session.admin = true;
          request.session.email = rows[0].email;
          if (!rows[0].admin) {
            response.redirect('/dashboard')
          } else {
            response.redirect('/dashboard')
          }
        } else {
          response.send('Incorrect Username and/or Password!');
        }
			} else {
				response.send('Incorrect Username and/or Password!');
			}			
			response.end();
		});
	} else {
		response.send('Please enter Username and Password!');
		response.end();
	}
});

app.post('/register2', async (request, response) => {
  var username = request.body.username;
  var password = request.body.password;
  var email = request.body.email;

console.log(username, password, email)

if (username && password && email) {
  connection.query('SELECT * FROM users WHERE user = ? OR email = ?', [username, email], async (error, results, fields) => {
    if (results.length > 0) {
      response.send('Username/email already taken!');
    } else {
      let salt = await bcrypt.genSalt(1)
      let pass = await bcrypt.hash(password, salt)
      connection.query(`INSERT INTO users (user, password, email, admin) VALUES('${username}', '${pass}', '${email}', 0)`, (err) => {
        console.log(err)
      })
      request.session.loggedin = true;
          request.session.username = username;
          request.session.email = email;
      response.redirect(`/dashboard`)
    }			
    response.end();
  });
} else {
  response.send('Please enter Username and Password!');
  response.end();
}
})

app.get('/register', async (req, res) => {
  res.render('register')
})

app.get('/logout', async (req, res) => {
  req.session.destroy(function(err) {
    // cannot access session here
    res.redirect('/')
  })
})

app.get('/dashboard', async (req, res) => {
  const user = req.session;
  if (req.session.loggedin) {
    res.render('dashboard', { user: user })
  } else {
    res.redirect('/')
    console.log(`user tried to go to dashboard without logging in`)
  }
})

app.listen(process.env.PORT || 5000);
console.log(`Ready`)