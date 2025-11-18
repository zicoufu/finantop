// Script simples para inicializar os dados de exemplo
import { storage } from "./storage_final.js";

console.log("Iniciando criação dos dados de exemplo...");

try {
  const resultado = await storage.initializeSampleData();
  console.log("Resultado:", resultado);
  if (resultado.success) {
    console.log("✅ Dados criados com sucesso!");
  } else {
    console.error("❌ Falha ao criar dados:", resultado.message);
  }
} catch (erro) {
  console.error("❌ Erro ao inicializar dados:", erro);
}
