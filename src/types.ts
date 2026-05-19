export interface Alumne {
  nom: string
  curs: string
  classe: string
  tries: string[]
}

export interface ResultatAlumne extends Alumne {
  tallerAssignat: string
  satisfet: boolean
  opcioObtinguda: 1 | 2 | 3 | null  // 1=primera opció, 2=segona, 3=tercera, null=cap
}

export interface ResultatTaller {
  nom: string
  alumnes: ResultatAlumne[]
}
