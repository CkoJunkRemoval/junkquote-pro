export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center">
      <div className="bg-white shadow-xl rounded-2xl p-12 w-[500px]">

        <h1 className="text-5xl font-bold text-blue-900 text-center">
          JunkQuote Pro
        </h1>

        <p className="text-center text-gray-600 mt-3">
          Professional Estimating Software for Junk Removal Companies
        </p>

        <button className="w-full mt-10 bg-blue-900 hover:bg-blue-800 text-white py-4 rounded-xl text-lg font-semibold transition">
          Login
        </button>

      </div>
    </main>
  );
}