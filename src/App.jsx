import { TournamentProvider, useTournament } from './store/tournamentStore'
import SetupWizard from './components/SetupWizard'
import TournamentBuilder from './components/TournamentBuilder'
import ExportPanel from './components/ExportPanel'

function AppContent() {
  const { state } = useTournament()

  if (state.step === 'build') return <TournamentBuilder />
  if (state.step === 'export') return <ExportPanel />
  return <SetupWizard />
}

export default function App() {
  return (
    <TournamentProvider>
      <AppContent />
    </TournamentProvider>
  )
}
