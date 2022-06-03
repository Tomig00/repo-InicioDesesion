const {options} = require('./public/options/mariaDB')
const path = require('path')
const knex = require('knex')(options)
const sendProd = require('./helper')
const Contenedor = require('./api')
const Mensajes = require('./apiMensajes')
const { response } = require('express')
const express = require('express')
const routerProductos = require('./routers/productos')
const hbs = require('express-handlebars')
const { Server: IOServer } = require('socket.io')
const { Server: HttpServer } = require('http')
const fetch = require('node-fetch')
const {normalize, schema} = require('normalizr')
const util = require('util')
const cookieParser = require('cookie-parser')
const session = require('express-session')
const { ne } = require('faker/lib/locales')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const {userDaos: User} = require('./daos/mainDaos')
const script = require('bcrypt')
const saltRounds = 10;
// const usuarios = 
// [
//   {mail: 'tomas@gusername', password: 'Tomas'},
//   {mail: 'tobias@gusername', password: 'Tobias'},
//   {mail: 'juan@gusername', password: 'Juan'}
// ]

const MongoStore = require('connect-mongo')
const Usuario = require('./daos/userDaos')
const advancedOptions = { useNewUrlParser: true, useUniFiedTopology: true }


let test = new Contenedor(knex,"prueba")
let msgManager = new Mensajes(knex, "mensajes")

const app = express()
const httpServer = new HttpServer(app)
const io = new IOServer(httpServer)

let messages = []
let prod = []
let user


app.use(express.urlencoded({extended: true}))
app.use(express.json())

app.use(cookieParser())
app.use(session({
  store: MongoStore.create({
    mongoUrl: 'mongodb+srv://tomasSesiones:asd123@tomi.fuaxu.mongodb.net/sesiones?retryWrites=true&w=majority',
    mongoOptions: advancedOptions,
    ttl: 30
  }),
  secret: 'secreto',
  resave: true,
  saveUninitialized: true
}))

app.use(passport.initialize())
app.use(passport.session())

//passport

passport.use(
  'register',

  new LocalStrategy(
    { passReqToCallback: true },
    async (req, username, password, done) => {
      console.log('entro signup')

      const usuarioDB = new Usuario()
      
      script.hash(password, saltRounds, async function (err, hash) {
        await usuarioDB.save({ mail: username, password: hash })
      });
      

      done(null, { mail: username })
    }
  )
)
passport.use(
  'login',
  new LocalStrategy(async (username, password, done) => { 
    let existe
    
    const usuarioDB = new User()
    
    const userDB = await usuarioDB.getByUser(username)
    
    script.compare(password, userDB?.password??'', function(err, result) {
      existe = result
      if (!existe) {  
        return done(null, false)
      } else {
        return done(null, existe)
      }
   });
    console.log(userDB)
  })
)

passport.serializeUser((user, done) => {
  done(null, user)
})

passport.deserializeUser((nombre, done) => {
  const usuarioDz = nombre
  done(null, usuarioDz)
})


/*----------- Motor de plantillas -----------*/
app.set('views', './src/views')

app.engine(
  '.hbs',
  hbs.engine({
    defaultLayout: 'main',
    layoutsDir: './src/views/layouts',
    extname: '.hbs',
  })
)
app.set('view engine', '.hbs')

//rutas

app.get('/login', (req, res) => {
  req.logOut()
  res.render('login')
})

app.get('/registrar', (req, res) => {
  res.render('register')
})

app.post(
  '/register',
  passport.authenticate('register', {
    successRedirect: '/login',
    failureRedirect: '/login-error',
  })
)

app.post(
  '/login',
  passport.authenticate('login', {
    successRedirect: '/datos',
    failureRedirect: '/login-error',
  })
)

app.get('/login-error', (req, res) => {
  res.render('login-error')
})

app.get('/datos', (req, res) => {
  console.log(req.session)
  res.sendFile(path.resolve("public/index.html"));
})

app.get('/logout', (req, res) => {
  req.logOut()

  res.redirect('/login')
})


app.use(express.static('./public'))
app.use('/api/productos-test', routerProductos)
app.get('/todo', (req, res) => {
  res.sendFile('index.html')
})






/* Server Listen */
const PORT = process.env.PORT || 8080
const server = httpServer.listen(PORT , () => console.log(`servidor Levantado ${PORT}`))
server.on('error', (error) => console.log(`Error en servidor ${error}`))


io.on('connection', async (socket) => {
  console.log('se conecto un usuario')

  async function getMsgOnConnection()
  {
    let mensajes = []
    mensajes = await msgManager.getMessages()
    return mensajes
  }
    
  messages = await getMsgOnConnection()

  socket.emit('mensajes', messages)
  sendProd(socket)

  async function prodF()
  {
    let preProd = []
    console.log("Antes del await")
    await fetch("http://localhost:8080/api/productos-test").then(respuesta => {return respuesta.text()}).then(plantilla => {
    
    preProd = JSON.parse(plantilla)
    
    return preProd
  })
    return preProd
  }

  prod = await prodF()
  io.sockets.emit('prod', prod);
  
  async function usuario(user)
  {
    return user
  }

  userName = await usuario(user)
  console.log(userName)
  io.sockets.emit('usuarios', userName)

  socket.on('new-message',async (data) => {
    async function agregarMsg(data)
    {
      let author = data
      let texto = data.texto
      author = new schema.Entity('author', {
        nombre: author.nombre,
        apellido: author.apellido,
        edad: author.edad,
        alias: author.alias,
        avatar: author.avatar
      }, {idAttribute: author.username})
      texto = new schema.Entity('text', {
        texto: texto
      })
      
      function print(objeto) 
      {
        console.log(util.inspect(objeto, false, 24, true))
      }
      const normalizado = normalize(author, texto)
      await print(normalizado)
      let agregado = []
      agregado = await msgManager.addMessage(data)
      return agregado
    }
    await agregarMsg(data)
    async function get()
    {
      let mensajes = []
      mensajes = await msgManager.getMessages()
      return mensajes
    }

    
    messages = await get()


    
    
    io.sockets.emit('messages', messages);
  })

  socket.on('new-prod', async (data) => {
    
    async function agregar(data)
    {
      let agregado = []
      agregado = test.addProd(data)
      return agregado
    }
    
    await agregar(data)

    async function prodF()
    {
      let preProd = []
      console.log("Antes del await")
      preProd = await test.getAll()
      return preProd
    }

    prod = await prodF()
    io.sockets.emit('prod', prod);
  })

})



