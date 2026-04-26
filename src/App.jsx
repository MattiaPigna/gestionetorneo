import { TournamentProvider, useTournament } from './store/tournamentStore'
import { AuthProvider, useAuth } from './store/authStore'
import SetupWizard from './components/SetupWizard'
import TournamentBuilder from './components/TournamentBuilder'
import ExportPanel from './components/ExportPanel'
import LoginScreen from './components/LoginScreen'

function AppContent() {
  const { state } = useTournament()
  const { user } = useAuth()

  if (!user) return <LoginScreen />
  if (state.step === 'build')   return <TournamentBuilder />
  if (state.step === 'export')  return <ExportPanel />
  return <SetupWizard />
}

export default function App() {
  return (
    <AuthProvider>
      <TournamentProvider>
        <AppContent />
      </TournamentProvider>
    </AuthProvider>
  )
}
