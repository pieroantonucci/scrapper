import Image from "next/image";
import SearchForm from "@/app/components/searchform";

export default function Home() {
  return (
    <div>
      <h1 className="text-center font-bold p-8">Buscar Causas por RUT</h1>
      <SearchForm />
    </div>
  );
    
}
