import LoginForm from '@/components/LoginForm'

export default function LoginPage() {
  return (
    <div
      className="w-screen h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Ambient background glows */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent), transparent)',
          top: '10%',
          left: '15%',
        }}
      />
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl opacity-10 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, var(--accent), transparent)',
          bottom: '20%',
          right: '20%',
        }}
      />
      <LoginForm />
    </div>
  )
}
