import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import type { Alumne, ResultatAlumne, ResultatTaller } from './types'
import './ToolPage.css'

type Step = 'upload' | 'preview' | 'config' | 'results'

interface Config {
  cupoObjectiu: number
  margeTolerancia: number
  pesCompanys: number // 0-10
}

interface Props {
  onBack: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const normNom = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

const matchKey = (nom: string) => normNom(nom).split(' ').slice(0, 2).join(' ')

const parseCurs = (val: string): { curs: string; classe: string } => {
  const v = val.trim()
  const matchFull = v.match(/^(\d+[rnstèa°º]*)[^\w]*(?:d['']?eso|eso)?[^\w]*([a-zA-Z])$/i)
  if (matchFull) {
    const any = matchFull[1].replace(/[°º]/g, 'r')
    const lletra = matchFull[2].toUpperCase()
    return { curs: any, classe: `${any}${lletra}` }
  }
  return { curs: v, classe: v }
}

// ── Algorisme de repartició ─────────────────────────────────────────────────

function repartir(alumnes: Alumne[], config: Config): ResultatTaller[] {
  const tallers = [...new Set(alumnes.flatMap(a => a.tries))]
  const { cupoObjectiu, margeTolerancia, pesCompanys } = config
  const maxCupo = cupoObjectiu + margeTolerancia
  const minCupo = Math.max(1, cupoObjectiu - margeTolerancia)

  const assignats: Record<string, ResultatAlumne[]> = {}
  tallers.forEach(t => { assignats[t] = [] })

  const shuffle = [...alumnes].sort(() => Math.random() - 0.5)
  const classesPresentades = [...new Set(shuffle.map(a => a.classe))].sort(() => Math.random() - 0.5)
  const ordre = pesCompanys > 0
    ? classesPresentades.flatMap(cls => shuffle.filter(a => a.classe === cls))
    : shuffle

  for (const alumne of ordre) {
    const { tries, classe } = alumne

    const puntuacions = tries.map(taller => {
      const actuals = assignats[taller].length
      const companys = assignats[taller].filter(a => a.classe === classe).length

      if (actuals >= maxCupo) return { taller, score: -Infinity }

      // Preferència: 1a opció val 3×, 2a val 2×, 3a val 1×
      const pos = tries.indexOf(taller)
      let score = 0
      if (pos !== -1) {
        score += (3 - pos) * 500  // 1500 / 1000 / 500
      }

      score += actuals < cupoObjectiu
        ? (cupoObjectiu - actuals) * 30
        : -(actuals - cupoObjectiu + 1) * 25

      score += companys * pesCompanys * 4

      return { taller, score }
    })

    puntuacions.sort((a, b) => b.score - a.score)
    let triat = puntuacions[0].taller

    if (!isFinite(puntuacions[0].score)) {
      triat = tallers.sort((a, b) => assignats[a].length - assignats[b].length)[0]
    }

    const posObtinguda = tries.indexOf(triat)
    const opcioObtinguda = posObtinguda === 0 ? 1 : posObtinguda === 1 ? 2 : posObtinguda === 2 ? 3 : null
    assignats[triat].push({ ...alumne, tallerAssignat: triat, satisfet: tries.includes(triat), opcioObtinguda })
  }

  const tallersBuits = tallers.filter(t => assignats[t].length < minCupo)
  const tallersPlens  = tallers.filter(t => assignats[t].length > cupoObjectiu)

  for (const dest of tallersBuits) {
    while (assignats[dest].length < minCupo) {
      let mogut = false
      for (const src of tallersPlens) {
        if (assignats[src].length <= minCupo) continue
        const idx = assignats[src].findIndex(a => a.tries.includes(dest))
        if (idx !== -1) {
          const alumne = assignats[src].splice(idx, 1)[0]
          const posObt = alumne.tries.indexOf(dest)
          assignats[dest].push({ ...alumne, tallerAssignat: dest, satisfet: true, opcioObtinguda: posObt === 0 ? 1 : posObt === 1 ? 2 : 3 })
          mogut = true
          break
        }
      }
      if (!mogut) {
        const src = tallers.filter(t => t !== dest)
          .sort((a, b) => assignats[b].length - assignats[a].length)[0]
        if (!src || assignats[src].length === 0) break
        const alumne = assignats[src].pop()!
        const posObt2 = alumne.tries.indexOf(dest)
        const opcioObt2 = posObt2 === 0 ? 1 : posObt2 === 1 ? 2 : posObt2 === 2 ? 3 : null
        assignats[dest].push({ ...alumne, tallerAssignat: dest, satisfet: alumne.tries.includes(dest), opcioObtinguda: opcioObt2 })
      }
    }
  }

  return tallers.map(nom => ({ nom, alumnes: assignats[nom] }))
}

// ── Component principal ─────────────────────────────────────────────────────

export default function ToolPage({ onBack }: Props) {
  const [step, setStep] = useState<Step>('upload')
  const [dragging, setDragging] = useState(false)
  const [alumnes, setAlumnes] = useState<Alumne[]>([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<Config>({ cupoObjectiu: 8, margeTolerancia: 3, pesCompanys: 5 })
  const [resultats, setResultats] = useState<ResultatTaller[]>([])
  const [cursSeleccionat, setCursSeleccionat] = useState('tots')
  const [llistaCompleta, setLlistaCompleta] = useState<Alumne[]>([])
  const [listaNom, setListaNom] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listaRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback((file: File) => {
    setError(null)
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('El fitxer ha de ser .xlsx, .xls o .csv')
      return
    }
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' })

        if (rows.length === 0) { setError('El fitxer sembla buit.'); return }

        const norm = (s: string) => s.toLowerCase().replace(/[\s_\-']/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '')
        const cols = Object.keys(rows[0])
        const find = (candidates: string[]) => cols.find(c => candidates.some(cand => norm(c).includes(norm(cand)))) ?? null

        const colNom    = find(['nom', 'nombre', 'name', 'alumne'])
        const colCognom = find(['cognom', 'apellido', 'surname', 'cognoms'])
        const colCurs   = find(['quincurs', 'curs', 'curso', 'year', 'any', 'course'])
        const colClasse = find(['classe', 'clase', 'class', 'grup', 'grupo'])
        const colT1     = find(['opcio1', 'opcion1', 'taller1', 'op1'])
        const colT2     = find(['opcio2', 'opcion2', 'taller2', 'op2'])
        const colT3     = find(['opcio3', 'opcion3', 'taller3', 'op3'])

        if (!colNom)  { setError("No s'ha trobat la columna de noms. Comprova que existeix una columna 'Nom'."); return }
        if (!colCurs && !colClasse) { setError("No s'ha trobat la columna de curs/classe ('Quin curs fas?' o 'Curs')."); return }
        if (!colT1 || !colT2 || !colT3) { setError("No s'han trobat les columnes d'opcions ('Opció 1', 'Opció 2', 'Opció 3')."); return }

        const parsed: Alumne[] = rows
          .filter(r => r[colNom!]?.trim())
          .map(r => {
            const nomBase = r[colNom!].trim()
            const cognom  = colCognom ? r[colCognom].trim() : ''
            const nomComplet = cognom ? `${nomBase} ${cognom}` : nomBase

            const cursRaw = colCurs ? r[colCurs] : (colClasse ? r[colClasse] : '')
            const { curs, classe } = colClasse && !colCurs
              ? { curs: r[colClasse].trim(), classe: r[colClasse].trim() }
              : parseCurs(cursRaw)

            const tries = [...new Set(
              [r[colT1!].trim(), r[colT2!].trim(), r[colT3!].trim()].filter(Boolean)
            )]

            return { nom: nomComplet, curs, classe, tries }
          })
          .filter(a => a.tries.length > 0)

        if (parsed.length === 0) { setError("No s'ha trobat cap alumne vàlid."); return }
        setAlumnes(parsed)
        setStep('preview')
      } catch { setError('Error llegint el fitxer. Assegura que és un Excel vàlid.') }
    }
    reader.readAsArrayBuffer(file)
  }, [])

  const parseLlista = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target!.result as string
      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const parsed: Alumne[] = []
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t')
        if (cols.length < 3) continue
        const grupRaw = cols[0].trim()
        const cognoms = cols[1].trim()
        const nom = cols[2].trim()
        if (!nom) continue
        const nomComplet = `${nom} ${cognoms}`.trim()
        const { curs, classe } = parseCurs(grupRaw)
        parsed.push({ nom: nomComplet, curs, classe, tries: [] })
      }
      setLlistaCompleta(parsed)
      setListaNom(file.name)
    }
    reader.readAsText(file, 'utf-8')
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) parseFile(file)
  }, [parseFile])

  const alumnesActius = cursSeleccionat === 'tots'
    ? alumnes
    : alumnes.filter(a => a.curs === cursSeleccionat)

  const executarMillorReparticio = (intents = 10): ResultatTaller[] => {
    const tallers = [...new Set(alumnesActius.flatMap(a => a.tries))]
    const cursos  = [...new Set(alumnesActius.map(a => a.curs))].sort()

    const calcular = () => {
      const combined: Record<string, ResultatAlumne[]> = {}
      tallers.forEach(t => { combined[t] = [] })
      for (const curs of cursos) {
        const grup = alumnesActius.filter(a => a.curs === curs)
        const cupoPerCurs = Math.round(grup.length / tallers.length)
        const res = repartir(grup, { ...config, cupoObjectiu: cupoPerCurs })
        res.forEach(t => { combined[t.nom].push(...t.alumnes) })
      }
      return tallers.map(nom => ({ nom, alumnes: combined[nom] }))
    }

    const satisfets = (res: ResultatTaller[]) =>
      res.flatMap(t => t.alumnes).filter(a => a.satisfet).length

    let millor = calcular()
    for (let i = 1; i < intents; i++) {
      const intent = calcular()
      if (satisfets(intent) > satisfets(millor)) millor = intent
    }
    return millor
  }

  const handleCalcular = () => {
    setResultats(executarMillorReparticio(10))
    setStep('results')
  }

  const topbar = (
    <div className="tool-topbar">
      <button className="back-btn" onClick={step === 'upload' ? onBack : () => setStep(step === 'results' ? 'config' : step === 'config' ? 'preview' : 'upload')}>
        ← {step === 'upload' ? 'Tornar' : 'Enrere'}
      </button>
      <div className="tool-logo">🎯 Selector de Tallers</div>
      <div className="privacy-pill">🔒 100% local</div>
    </div>
  )

  // ── UPLOAD ──
  if (step === 'upload') return (
    <div className="tool-wrapper">
      {topbar}
      <div className="upload-container">
        <div className="upload-header">
          <h1>Puja el fitxer d'alumnes</h1>
          <p>Arrossega el teu Excel aquí o fes clic per seleccionar-lo</p>
        </div>
        <div
          className={`dropzone ${dragging ? 'dragging' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }} />
          <div className="dropzone-icon">{dragging ? '📂' : '📊'}</div>
          <div className="dropzone-text">{dragging ? 'Deixa anar el fitxer aquí' : 'Arrossega o fes clic per obrir'}</div>
          <div className="dropzone-hint">.xlsx · .xls · .csv</div>
        </div>
        {error && <div className="upload-error">⚠️ {error}</div>}
        <div className="format-hint">
          <strong>Format esperat:</strong> una fila per alumne amb les columnes&nbsp;
          {['Nom','Curs','Classe','Taller 1','Taller 2','Taller 3'].map(c => <span key={c} className="col-badge">{c}</span>)}
        </div>

        {/* Llista completa opcional */}
        <div className="llista-upload-section">
          <div className="llista-upload-header">
            <span className="llista-upload-label">Llista completa d'alumnes <span className="optional-tag">opcional</span></span>
            <span className="llista-upload-hint">Puja el .txt per detectar qui no ha respost el formulari</span>
          </div>
          <div
            className={`dropzone-small ${listaNom ? 'done' : ''}`}
            onClick={() => listaRef.current?.click()}
          >
            <input ref={listaRef} type="file" accept=".txt"
              style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) parseLlista(f) }} />
            {listaNom
              ? <><span className="dropzone-small-icon">✅</span> <span>{listaNom} · {llistaCompleta.length} alumnes</span></>
              : <><span className="dropzone-small-icon">📋</span> <span>Arrossega o fes clic · .txt</span></>
            }
          </div>
        </div>
      </div>
    </div>
  )

  // ── PREVIEW ──
  if (step === 'preview') {
    const cursos = [...new Set(alumnes.map(a => a.curs))].sort()
    const tallers = [...new Set(alumnesActius.flatMap(a => a.tries))].sort()

    return (
      <div className="tool-wrapper">
        {topbar}
        <div className="preview-container">
          <div className="preview-header">
            <div className="preview-title">
              <span className="file-icon">📗</span>
              <div><h2>{fileName}</h2><p>{alumnes.length} alumnes carregats correctament</p></div>
            </div>
            <button className="btn-ghost" onClick={() => { setAlumnes([]); setFileName(''); setStep('upload') }}>Canviar fitxer</button>
          </div>

          <div className="curs-filter-section">
            <span className="curs-filter-label">Selecciona el curs a repartir:</span>
            <div className="curs-filter">
              <button className={`curs-btn ${cursSeleccionat === 'tots' ? 'active' : ''}`} onClick={() => setCursSeleccionat('tots')}>
                Tots els cursos
              </button>
              {cursos.map(c => (
                <button key={c} className={`curs-btn ${cursSeleccionat === c ? 'active' : ''}`} onClick={() => setCursSeleccionat(c)}>
                  {c} <span className="curs-btn-count">{alumnes.filter(a => a.curs === c).length}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="preview-scope">
            {cursSeleccionat === 'tots'
              ? <><strong>{alumnes.length} alumnes</strong> de tots els cursos · {tallers.length} tallers</>
              : <><strong>{alumnesActius.length} alumnes</strong> de <strong>{cursSeleccionat}</strong> · {tallers.length} tallers</>
            }
          </div>

          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead><tr><th>Nom</th><th>Curs</th><th>Classe</th><th>Opció 1</th><th>Opció 2</th><th>Opció 3</th></tr></thead>
              <tbody>
                {alumnesActius.slice(0, 15).map((a, i) => (
                  <tr key={i}>
                    <td>{a.nom}</td><td className="center">{a.curs}</td><td className="center">{a.classe}</td>
                    <td>{a.tries[0] ? <span className="badge-t">{a.tries[0]}</span> : null}</td>
                    <td>{a.tries[1] ? <span className="badge-t">{a.tries[1]}</span> : null}</td>
                    <td>{a.tries[2] ? <span className="badge-t">{a.tries[2]}</span> : null}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {alumnesActius.length > 15 && (
              <div className="table-more">… i {alumnesActius.length - 15} alumnes més</div>
            )}
          </div>
          <div className="preview-actions">
            <button className="btn-primary-tool" onClick={() => setStep('config')}>
              Continuar amb {cursSeleccionat === 'tots' ? 'tots els cursos' : cursSeleccionat} →
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── CONFIG ──
  if (step === 'config') {
    const tallers = [...new Set(alumnesActius.flatMap(a => a.tries))].sort()
    const cursos  = [...new Set(alumnesActius.map(a => a.curs))].sort()
    const optimGlobal = Math.round(alumnesActius.length / tallers.length)

    return (
      <div className="tool-wrapper">
        {topbar}
        <div className="config-container">
          <div className="config-header">
            <h1>Configura la repartició</h1>
            <p>{alumnesActius.length} alumnes · {tallers.length} tallers · {cursSeleccionat === 'tots' ? `${cursos.length} cursos` : cursSeleccionat}</p>
          </div>

          <div className="config-cards">
            <div className="config-card">
              <div className="config-card-icon">👥</div>
              <h3>Alumnes per taller <span className="per-curs-tag">per curs</span></h3>
              <p className="config-desc">
                La repartició es fa per curs. L'òptim global és <strong>{optimGlobal}</strong> però cada curs tindrà el seu cupo calculat automàticament.
              </p>
              <div className="cupo-breakdown">
                {cursos.map(c => {
                  const n = alumnes.filter(a => a.curs === c).length
                  const opt = Math.round(n / tallers.length)
                  return (
                    <div key={c} className="cupo-row">
                      <span className="cupo-curs">{c}</span>
                      <span className="cupo-calc">{n} ÷ {tallers.length} =</span>
                      <span className="cupo-val">{opt} alumnes/taller</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="config-card">
              <div className="config-card-icon">↔️</div>
              <h3>Marge de tolerància</h3>
              <p className="config-desc">Variació màxima permesa per taller i curs.</p>
              <div className="number-input-row">
                <button className="num-btn" onClick={() => setConfig(c => ({ ...c, margeTolerancia: Math.max(0, c.margeTolerancia - 1) }))}>−</button>
                <span className="num-val">±{config.margeTolerancia}</span>
                <button className="num-btn" onClick={() => setConfig(c => ({ ...c, margeTolerancia: c.margeTolerancia + 1 }))}>+</button>
              </div>
            </div>

            <div className="config-card config-card-full">
              <div className="config-card-icon">👫</div>
              <h3>Pes dels companys de classe</h3>
              <p className="config-desc">Quant d'important és que alumnes de la mateixa classe acabin junts al taller.</p>
              <div className="slider-row">
                <span className="slider-label">Gens</span>
                <input
                  type="range" min={0} max={10} step={1}
                  value={config.pesCompanys}
                  onChange={e => setConfig(c => ({ ...c, pesCompanys: Number(e.target.value) }))}
                  className="slider"
                />
                <span className="slider-label">Molt</span>
              </div>
              <div className="slider-value">
                {config.pesCompanys === 0 && 'Sense preferència per companys'}
                {config.pesCompanys > 0 && config.pesCompanys <= 3 && 'Poc pes — prioritat a les preferències individuals'}
                {config.pesCompanys > 3 && config.pesCompanys <= 7 && 'Pes moderat — equilibri entre preferències i companys'}
                {config.pesCompanys > 7 && 'Molt de pes — prioritat a que vagin junts'}
              </div>
            </div>
          </div>

          <div className="config-actions">
            <button className="btn-primary-tool" onClick={handleCalcular}>
              🎲 Calcular repartició
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTS ──
  if (step === 'results') {
    const llistaActiva = llistaCompleta.filter(a =>
      cursSeleccionat === 'tots' ? true : a.curs === cursSeleccionat
    )
    return <ResultsStep
      resultats={resultats}
      setResultats={setResultats}
      llistaCompleta={llistaActiva}
      alumnesTotal={alumnes.length}
      config={config}
      fileName={fileName}
      onRecalcular={() => setResultats(executarMillorReparticio(20))}
      onBack={() => setStep('config')}
      topbar={topbar}
    />
  }

  return null
}

// ── ResultsStep ─────────────────────────────────────────────────────────────

function ResultsStep({ resultats, setResultats, llistaCompleta, alumnesTotal: _alumnesTotal, config: _config, fileName, onRecalcular, onBack, topbar }: {
  resultats: ResultatTaller[]
  setResultats: React.Dispatch<React.SetStateAction<ResultatTaller[]>>
  llistaCompleta: Alumne[]
  alumnesTotal: number
  config: Config
  fileName: string
  onRecalcular: () => void
  onBack: () => void
  topbar: React.ReactNode
}) {
  const [cursFiltrat, setCursFiltrat] = useState<string>('tots')
  const [draggingAlumne, setDraggingAlumne] = useState<Alumne | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const cursos = [...new Set(resultats.flatMap(r => r.alumnes.map(a => a.curs)))].sort()

  const alumnesFiltrats = cursFiltrat === 'tots'
    ? resultats.flatMap(r => r.alumnes)
    : resultats.flatMap(r => r.alumnes).filter(a => a.curs === cursFiltrat)

  const totalSatisfets = alumnesFiltrats.filter(a => a.satisfet).length
  const pctSatisfets   = alumnesFiltrats.length > 0 ? Math.round((totalSatisfets / alumnesFiltrats.length) * 100) : 0

  // Alumnes que no han respost (de la llista completa, no apareixen als resultats)
  const assignatsKeys = new Set(resultats.flatMap(r => r.alumnes).map(a => matchKey(a.nom)))
  const noResponents = llistaCompleta.filter(a => !assignatsKeys.has(matchKey(a.nom)))

  const handleDrop = (tallerNom: string) => {
    if (!draggingAlumne) return
    const nouvAlumne: ResultatAlumne = {
      ...draggingAlumne,
      tallerAssignat: tallerNom,
      satisfet: false,
      opcioObtinguda: null,
    }
    setResultats(prev => prev.map(t =>
      t.nom === tallerNom ? { ...t, alumnes: [...t.alumnes, nouvAlumne] } : t
    ))
    setDraggingAlumne(null)
    setDropTarget(null)
  }

  const exportar = () => {
    const wb = XLSX.utils.book_new()

    const tots = resultats
      .flatMap(t => t.alumnes)
      .sort((a, b) => a.tallerAssignat.localeCompare(b.tallerAssignat) || a.curs.localeCompare(b.curs) || a.classe.localeCompare(b.classe))
      .map(a => ({
        Nom: a.nom,
        Curs: a.curs,
        Classe: a.classe,
        'Taller assignat': a.tallerAssignat,
        'Opció obtinguda': a.opcioObtinguda ? `${a.opcioObtinguda}a` : 'Manual/Cap',
        'Era una opció triada': a.satisfet ? 'Sí' : 'No',
      }))

    if (noResponents.length > 0) {
      const noResp = noResponents.map(a => ({
        Nom: a.nom,
        Curs: a.curs,
        Classe: a.classe,
        'Taller assignat': '— sense assignar —',
        'Opció obtinguda': 'No ha respost',
        'Era una opció triada': 'No',
      }))
      tots.push(...noResp)
    }

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tots), 'Repartició')
    XLSX.writeFile(wb, `reparticio_${fileName}`)
  }

  return (
    <div className="tool-wrapper">
      {topbar}
      <div className="results-container">

        {/* Filtre per curs */}
        <div className="curs-filter-section">
          <span className="curs-filter-label">Filtra per curs:</span>
          <div className="curs-filter">
            <button className={`curs-btn ${cursFiltrat === 'tots' ? 'active' : ''}`} onClick={() => setCursFiltrat('tots')}>
              Tots els cursos
            </button>
            {cursos.map(c => {
              const n = resultats.flatMap(r => r.alumnes).filter(a => a.curs === c).length
              return (
                <button key={c} className={`curs-btn ${cursFiltrat === c ? 'active' : ''}`} onClick={() => setCursFiltrat(c)}>
                  {c} <span className="curs-btn-count">{n}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Capçalera amb % prominent */}
        <div className="results-header">
          <div className="results-header-left">
            <div className="pct-hero" style={{
              color: pctSatisfets >= 80 ? '#059669' : pctSatisfets >= 60 ? '#d97706' : '#dc2626'
            }}>
              {pctSatisfets}%
            </div>
            <div className="pct-hero-info">
              <div className="pct-hero-label">d'alumnes han obtingut un taller triat</div>
              <div className="pct-hero-sub">
                {totalSatisfets} de {alumnesFiltrats.length} alumnes ·{' '}
                {cursFiltrat === 'tots' ? 'tots els cursos' : cursFiltrat} · {resultats.length} tallers
              </div>
              {alumnesFiltrats.length - totalSatisfets > 0 && (
                <div className="pct-hero-warn">
                  ⚠️ {alumnesFiltrats.length - totalSatisfets} alumnes assignats fora de les seves opcions
                </div>
              )}
            </div>
          </div>
          <div className="results-header-actions">
            <button className="btn-ghost" onClick={onBack}>⚙️ Configuració</button>
            <button className="btn-ghost" onClick={onRecalcular}>🔀 Recalcular</button>
            <button className="btn-export" onClick={exportar}>⬇️ Exportar Excel</button>
          </div>
        </div>

        {/* Panel d'alumnes sense resposta */}
        {noResponents.length > 0 && (
          <div className="no-resp-panel">
            <div className="no-resp-header">
              <span className="no-resp-title">⚠️ No han respost el formulari</span>
              <span className="no-resp-count">{noResponents.length} alumnes</span>
              <span className="no-resp-hint">Arrossega'ls fins al taller que vols assignar-los</span>
            </div>
            <div className="no-resp-list">
              {noResponents.map((a, i) => (
                <div
                  key={i}
                  className="no-resp-chip"
                  draggable
                  onDragStart={() => setDraggingAlumne(a)}
                  onDragEnd={() => { setDraggingAlumne(null); setDropTarget(null) }}
                >
                  <span className="no-resp-chip-nom">{a.nom}</span>
                  <span className="no-resp-chip-cls">{a.classe}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Targetes per taller */}
        <div className="tallers-grid">
          {resultats.map(taller => {
            const alumnesCard = cursFiltrat === 'tots'
              ? taller.alumnes
              : taller.alumnes.filter(a => a.curs === cursFiltrat)
            if (alumnesCard.length === 0 && cursFiltrat !== 'tots') return null
            const satisfets = taller.alumnes.filter(a => a.satisfet).length
            const isTarget = dropTarget === taller.nom
            return (
              <div
                key={taller.nom}
                className={`taller-card ${isTarget ? 'drop-target' : ''} ${draggingAlumne ? 'droppable' : ''}`}
                onDragOver={draggingAlumne ? (e) => { e.preventDefault(); setDropTarget(taller.nom) } : undefined}
                onDragLeave={() => setDropTarget(null)}
                onDrop={() => handleDrop(taller.nom)}
              >
                <div className="taller-card-header">
                  <h3>{taller.nom}</h3>
                  <span className="taller-count">{taller.alumnes.length} alumnes</span>
                </div>
                <div className="taller-satisfets">
                  <div className="satisfets-bar">
                    <div className="satisfets-fill" style={{ width: `${taller.alumnes.length > 0 ? Math.round(satisfets / taller.alumnes.length * 100) : 0}%` }} />
                  </div>
                  <span className="satisfets-pct">{taller.alumnes.length > 0 ? Math.round(satisfets / taller.alumnes.length * 100) : 0}% satisfets</span>
                </div>
                {draggingAlumne && (
                  <div className="drop-hint">Deixa anar aquí</div>
                )}
                <ul className="alumnes-list">
                  {alumnesCard.map((a, i) => (
                    <li key={i} className={a.satisfet ? '' : 'no-satisfet'}>
                      <span className="alumne-nom">{a.nom}</span>
                      <span className="alumne-meta">{a.classe}</span>
                      <span className={`badge-opcio badge-opcio-${a.opcioObtinguda ?? 'cap'}`}>
                        {a.opcioObtinguda === 1 ? '1a' : a.opcioObtinguda === 2 ? '2a' : a.opcioObtinguda === 3 ? '3a' : a.opcioObtinguda === null && !a.satisfet ? '✗' : 'man'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
