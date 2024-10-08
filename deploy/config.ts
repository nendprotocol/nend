import {config as configDotenv} from 'dotenv'
import {resolve} from 'path'

// switch(process.env.NODE_ENV) {
//   case "development":
//     console.log("Environment is 'development'")
//     configDotenv({
//       path: resolve(__dirname, "../.env.development")
//     })
//     break
//   default:
//     throw new Error(`'NODE_ENV' ${process.env.NODE_ENV} is not handled!`)
// }

configDotenv({
    path: resolve(__dirname, "./.env")
})

const throwIfNot = function<T, K extends keyof T>(obj: Partial<T>, prop: K, msg?: string): T[K] {
    if(obj[prop] === undefined || obj[prop] === null){
      throw new Error(msg || `Environment is missing variable ${String(prop)}`)
    } else {
      return obj[prop] as T[K]
    }
  }

  const validate = ['POSTGRES_HOST', 'POSTGRES_PORT', 'POSTGRES_USER', 'POSTGRES_PASSWORD', 'POSTGRES_DB'];
  validate.forEach(v => {
    throwIfNot(process.env, v)
  });
  
  export interface IProcessEnv {
    POSTGRES_HOST: string;
    POSTGRES_PORT: string;
    POSTGRES_USER: string;
    POSTGRES_PASSWORD: string;
    POSTGRES_DB: string;
  }
  
  declare global {
    namespace NodeJS {
      interface ProcessEnv extends IProcessEnv { }
    }
  }