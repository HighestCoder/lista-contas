# 📊 Livro-Caixa Digital

Aplicação web minimalista de controle financeiro com sincronização em tempo real na nuvem, cálculo automático de saldo progressivo (*running balance*) e exportação de relatórios em PDF estilo livro-caixa físico.

Desenvolvido com **React**, **TypeScript**, **Vite**, **jsPDF** e **Firebase** (Authentication, Cloud Firestore & Hosting).

---

## ✨ Funcionalidades Principais

- **Autenticação Segura:** Login e cadastro por e-mail/senha via Firebase Authentication, com diagnóstico detalhado de erros e modo demonstração integrado.
- **Sincronização em Tempo Real:** Persistência na coleção `Transacoes` do Cloud Firestore via `onSnapshot`.
- **Cálculo Automático de Saldo (*Running Balance*):** Processamento cronológico linha por linha ($\text{Saldo}_i = \text{Saldo}_{i-1} + \text{Entrada}_i - \text{Saída}_i$) com precisão monetária de centavos.
- **Gestão Completa de Lançamentos:** Inserção rápida no topo da tabela, edição modal e exclusão com confirmação.
- **Histórico, Filtros e Paginação:** Busca instantânea por descrição, filtro por Mês/Ano e paginação de 50 registros por página.
- **Exportação para PDF (Estilo Livro-Caixa Físico):** Seleção individual ou em lote (por página) para gerar relatórios em PDF prontos para impressão, com totalizadores exclusivos dos itens selecionados.

---

## 🚀 Como Executar Localmente

1. Instale as dependências:
   ```bash
   npm install
   ```
2. Configure as variáveis de ambiente no arquivo `.env` (veja `.env.example`).
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

---

## 📦 Build e Deploy (Firebase Hosting)

```bash
# Gerar build otimizado de produção na pasta dist/
npm run build

# Publicar no Firebase Hosting
npx firebase-tools deploy --only hosting
```
