import { hashPassword, verifyPassword } from "./lib/auth/password";

const password = "232323";
const hash = hashPassword(password);
console.log("HASH:", hash);
console.log("VERIFY:", verifyPassword(password, hash));
