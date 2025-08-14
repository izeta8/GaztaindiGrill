import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <>
      <Head>
        <title>Gaztaindi Grill - Dashboard</title>
        <meta name="description" content="Sistema de control de parrillas Gaztaindi" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main>
        <h1>Gaztaindi Grill - Dashboard</h1>
        
        <nav>
          <Link href="/programs/create">
            INSERTAR PROGRAMA
          </Link>
          <br />
          
          <Link href="/programs/list">
            EJECUTAR PROGRAMA
          </Link>
          <br />
        </nav>
      </main>
    </>
  );
}
