import { useState } from 'react'
import ToolPage from './ToolPage'
import './App.css'

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

function App() {
  const [showTool, setShowTool] = useState(false)

  if (showTool) {
    return <ToolPage onBack={() => setShowTool(false)} />
  }

  return (
    <>
      {/* Nav */}
      <nav className="nav">
        <div className="nav-logo">
          <span>🎯</span>
          Selector de Tallers
        </div>
        <button className="nav-cta" onClick={() => setShowTool(true)}>
          Accedir a l'eina →
        </button>
      </nav>

      {/* Privacy banner */}
      <div className="privacy-banner">
        <span className="privacy-icon">🔒</span>
        <strong>100% local · </strong>
        El teu Excel no s'envia a cap servidor. Tot el processament es fa al teu ordinador.
      </div>

      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">✨ Eina per a tutors</div>
        <h1>
          Reparteix els alumnes als tallers de forma <em>intel·ligent</em>
        </h1>
        <p className="hero-sub">
          Puja el teu Excel, configura les preferències i obté en segons una repartició
          equilibrada que respecta les eleccions dels alumnes i afavoreix que els companys
          de classe vagin junts.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => setShowTool(true)}>🚀 Provar l'eina</button>
          <button className="btn-secondary" onClick={() => scrollTo('com-funciona')}>Veure com funciona ↓</button>
        </div>
      </section>


      {/* Com funciona */}
      <section className="section" id="com-funciona">
        <span className="section-tag">Com funciona</span>
        <h2 className="section-title">Tres passos i ja tens la repartició</h2>
        <p className="section-sub">
          Sense instalacions, sense complicacions. Tot des del navegador.
        </p>

        <div className="steps">
          <div className="step-card">
            <div className="step-icon">📂</div>
            <div className="step-number">1</div>
            <h3>Puja l'Excel</h3>
            <p>
              Arrossega o selecciona el fitxer amb les dades dels alumnes:
              nom, classe i els tres tallers que han triat (totes les tries
              tenen el mateix pes).
            </p>
          </div>
          <div className="step-card">
            <div className="step-icon">⚙️</div>
            <div className="step-number">2</div>
            <h3>Configura els paràmetres</h3>
            <p>
              Defineix el nombre objectiu d'alumnes per taller, el marge
              permès, i ajusta el <strong>slider de companys de classe</strong> per
              decidir quant de pes vols que tingui anar amb amics.
            </p>
          </div>
          <div className="step-card">
            <div className="step-icon">📊</div>
            <div className="step-number">3</div>
            <h3>Revisa i exporta</h3>
            <p>
              Consulta la repartició per curs (1r, 2n, 3r, 4t), les
              estadístiques de satisfacció i descarrega el resultat en
              Excel llest per usar.
            </p>
          </div>
        </div>
      </section>

      {/* Format Excel */}
      <div className="features-bg">
        <section className="section">
          <span className="section-tag">Format del fitxer</span>
          <h2 className="section-title">Com ha d'estar l'Excel</h2>
          <p className="section-sub">
            Una fila per alumne, amb aquestes columnes. L'ordre de les columnes
            pot variar; l'eina les detecta automàticament.
          </p>

          <div className="excel-mock">
            <div className="excel-header">
              📗 alumnes_tallers.xlsx
            </div>
            <table className="excel-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Curs</th>
                  <th>Classe</th>
                  <th>Taller 1</th>
                  <th>Taller 2</th>
                  <th>Taller 3</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Marta García</td>
                  <td>1r</td>
                  <td><span className="badge-class">1rA</span></td>
                  <td><span className="badge-taller">Robòtica</span></td>
                  <td><span className="badge-taller">Teatre</span></td>
                  <td><span className="badge-taller">Cuina</span></td>
                </tr>
                <tr>
                  <td>Joan Puig</td>
                  <td>2n</td>
                  <td><span className="badge-class">2nB</span></td>
                  <td><span className="badge-taller">Música</span></td>
                  <td><span className="badge-taller">Pintura</span></td>
                  <td><span className="badge-taller">Robòtica</span></td>
                </tr>
                <tr>
                  <td>Laia Torres</td>
                  <td>1r</td>
                  <td><span className="badge-class">1rA</span></td>
                  <td><span className="badge-taller">Teatre</span></td>
                  <td><span className="badge-taller">Cuina</span></td>
                  <td><span className="badge-taller">Fotografia</span></td>
                </tr>
                <tr>
                  <td>Pau Martínez</td>
                  <td>3r</td>
                  <td><span className="badge-class">3rC</span></td>
                  <td><span className="badge-taller">Esports</span></td>
                  <td><span className="badge-taller">Robòtica</span></td>
                  <td><span className="badge-taller">Música</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Funcionalitats */}
      <section className="section">
        <span className="section-tag">Funcionalitats</span>
        <h2 className="section-title">Tot el que necessites</h2>
        <p className="section-sub">
          Dissenyat específicament per a la dinàmica de tallers de centre.
        </p>

        <div className="features">
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#ede9fe' }}>🎲</div>
            <h3>Tres tries iguals</h3>
            <p>
              Els tres tallers triats per cada alumne tenen el mateix pes.
              L'algorisme intenta que tots aconsegueixin almenys un dels seus tres.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#fef3c7' }}>👫</div>
            <h3>Slider de companys</h3>
            <p>
              Decideix quant vols afavorir que alumnes de la mateixa classe
              acabin junts al taller. Des de "gens" fins a "molt important".
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#d1fae5' }}>⚖️</div>
            <h3>Cupo flexible</h3>
            <p>
              Defineix el nombre ideal d'alumnes per taller i un marge de
              tolerància. L'eina respecta els límits sense deixar ningú sense
              taller.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#fee2e2' }}>📚</div>
            <h3>Repartició per curs</h3>
            <p>
              Visualitza els resultats separats per curs (1r, 2n, 3r, 4t ESO)
              per facilitar la gestió i la comunicació amb els tutors de cada
              grup.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#e0f2fe' }}>📈</div>
            <h3>Estadístiques de satisfacció</h3>
            <p>
              Veu quants alumnes han obtingut un dels seus tallers triats i
              quants n'hi ha que no. Ajusta els paràmetres i torna a calcular
              fins que el resultat sigui òptim.
            </p>
          </div>
          <div className="feature-card">
            <div className="feature-icon" style={{ background: '#f0fdf4' }}>💾</div>
            <h3>Exporta a Excel</h3>
            <p>
              Descarrega la repartició final en un Excel ben formatat, llest
              per imprimir o compartir amb l'equip docent.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <div className="features-bg">
        <section className="section">
          <span className="section-tag">Preguntes freqüents</span>
          <h2 className="section-title">Tens dubtes?</h2>

          <div className="faq-list">
            <div className="faq-item">
              <h3>❓ Quin format ha de tenir exactament l'Excel?</h3>
              <p>
                Una fila per alumne amb les columnes: Nom, Curs, Classe, Taller1, Taller2, Taller3.
                Els noms dels tallers han de coincidir exactament amb la llista de tallers.
                L'eina t'avisarà si detecta inconsistències.
              </p>
            </div>
            <div className="faq-item">
              <h3>❓ Quants tallers es poden configurar?</h3>
              <p>
                Entre 5 i 15 tallers simultanis. Cada alumne tria exactament 3, totes
                amb el mateix pes a l'hora de fer la repartició.
              </p>
            </div>
            <div className="faq-item">
              <h3>❓ Què passa si un taller queda molt desequilibrat?</h3>
              <p>
                Pots ajustar el marge de tolerància del cupo i tornar a calcular.
                L'eina mostra estadístiques en temps real perquè puguis trobar
                el millor equilibri entre preferències i cupos.
              </p>
            </div>
            <div className="faq-item">
              <h3>❓ Les dades surten del navegador?</h3>
              <p>
                No. Tot el processament es fa localment al teu ordinador. Cap dada
                d'alumnes s'envia a cap servidor extern.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* CTA */}
      <section className="cta-section" id="eina">
        <h2>Llest per fer la repartició?</h2>
        <p>Puja el teu Excel i tens el resultat en menys d'un minut.</p>
        <button className="btn-white" onClick={() => setShowTool(true)}>🚀 Començar ara</button>
        <p className="cta-privacy">🔒 Les dades no surten del teu navegador</p>
      </section>

      {/* Footer */}
      <footer className="footer">
        Selector de Tallers · Eina per a tutors · Tot el processament és local, les dades no surten del teu navegador.
      </footer>
    </>
  )
}

export default App
