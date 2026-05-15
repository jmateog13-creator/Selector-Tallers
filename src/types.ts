export interface Alumne {
  nom: string
  curs: string
  classe: string
  tries: string[]
}

export interface ResultatAlumne extends Alumne {
  tallerAssignat: string
  satisfet: boolean
}

export interface ResultatTaller {
  nom: string
  alumnes: ResultatAlumne[]
}
