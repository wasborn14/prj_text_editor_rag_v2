import { Header } from "@/components/organisms/Header/Header";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Welcome to RAG Documentation Search
          </h2>
          <p className="text-gray-600">
            Search through your GitHub repositories using AI-powered semantic search.
          </p>
        </div>
      </main>
    </div>
  );
}
