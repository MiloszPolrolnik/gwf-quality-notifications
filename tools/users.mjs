// Account admin CLI (run from the project root, honours QN_DATA_DIR):
//   node tools/users.mjs list
//   node tools/users.mjs reset-password <email> <new-password>
//   node tools/users.mjs delete <email>
import * as db from '../server/db.js'
import { hashPassword } from '../server/auth.js'

const [cmd, email, password] = process.argv.slice(2)
const mail = email?.trim().toLowerCase()

if (cmd === 'list') {
  console.table(db.listUsers())
} else if (cmd === 'reset-password' && mail && password) {
  if (password.length < 8) throw new Error('password must have at least 8 characters')
  console.log(db.setPassword(mail, await hashPassword(password)) ? 'password changed' : 'no such user')
} else if (cmd === 'delete' && mail) {
  console.log(db.deleteUser(mail) ? 'user deleted' : 'no such user')
} else {
  console.log('usage: node tools/users.mjs list | reset-password <email> <new-password> | delete <email>')
  process.exitCode = 1
}
