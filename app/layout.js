import './globals.css'

export const metadata = {
  title: 'Digital Signage SaaS',
  description: 'Multi-tenant digital signage platform',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
