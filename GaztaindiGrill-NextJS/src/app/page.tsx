import Head from 'next/head'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Gaztaindi Grill - Dashboard</title>
        <meta name="description" content="Sistema de control de parrillas Gaztaindi" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <main className="max-w-4xl mx-auto">
        {/* Título Principal */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Gaztaindi Grill
          </h1>
          <p className="mt-2 text-sm text-gray-500">Panel de Administración</p>
        </div>
        
        {/* Contenedor de las tarjetas en Grid */}
        <nav className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tarjeta: Control de Parrillas */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Control Operativo</h2>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <Link 
                href="/control" 
                className="block w-full text-center px-4 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
              >
                Control General
              </Link>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Link 
                  href="/control/grill?index=0" 
                  className="block text-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Grill 0
                </Link>
                <Link 
                  href="/control/grill?index=1" 
                  className="block text-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Grill 1
                </Link>
              </div>
            </div>
          </div>

          {/* Tarjeta: Modos */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ajustes</h2>
            </div>
            <div className="p-6 flex flex-col justify-center h-[calc(100%-3.5rem)]">
              <Link 
                href="/mode" 
                className="block w-full text-center px-4 py-2.5 border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors font-medium"
              >
                Gestionar Modos
              </Link>
            </div>
          </div>

          {/* Tarjeta: Programas (Ocupa las dos columnas en pantallas grandes) */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden md:col-span-2">
            <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-50">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Gestión de Programas</h2>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Link 
                href="/programs/list" 
                className="block text-center px-4 py-3 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 hover:shadow-sm transition-all"
              >
                Listado
              </Link>
              <Link 
                href="/programs/create" 
                className="block text-center px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium"
              >
                + Crear Programa
              </Link>
              <Link 
                href="/programs/debug" 
                className="block text-center px-4 py-3 border border-red-100 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                Depurar
              </Link>
            </div>
          </div>

        </nav>
      </main>
    </div>
  );
}