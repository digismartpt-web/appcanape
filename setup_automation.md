# 📧 Guia de Automação: Relatório Semanal por Email

Este guia explica como configurar o Firebase para enviar automaticamente um relatório de vendas (CSV) para **digismartpt@gmail.com** todos os lundis matin às 08:00.

---

## 🛠️ Passo 0: Preparar sua Conta Firebase (Obrigatório)

As funções automáticas (Cloud Functions) exigem que o seu projeto Firebase esteja no **Plano Blaze (Pay-as-you-go)**.

1.  Aceda à [Consola Firebase](https://console.firebase.google.com/).
2.  No canto inferior esquerdo, clique em **"Upgrade"** ou **"Modify Plan"**.
3.  Selecione o plano **Blaze**. 
    - *Nota: O Google oferece um nível gratuito generoso. Para 1 email por semana, o custo será zero ou apenas alguns cêntimos se ultrapassar os limites.*

---

## 🚀 Passo 1: Instalar as Ferramentas no seu Computador

Abra o seu terminal (PowerShell ou Command Prompt) e execute:

```bash
# 1. Instalar o Node.js (se ainda não tiver: https://nodejs.org/)

# 2. Instalar a ferramenta do Firebase
npm install -g firebase-tools

# 3. Fazer login na sua conta Google
firebase login
```

---

## 📂 Passo 2: Inicializar as Functions

No diretório principal do seu projeto (`AppClickandCollect Olhar o Sol`):

```bash
# Inicializar
firebase init functions
```

-   Selecione **"Use an existing project"** e escolha o seu projeto (`pizzas-e0a57`).
-   Escolha a linguagem: **TypeScript**.
-   Responda **Yes** para usar ESLint.
-   Responda **Yes** para instalar as dependências agora.

---

## 💻 Passo 3: Colocar o Código

Abra o ficheiro recém-criado `functions/src/index.ts` e substitua todo o conteúdo pelo código abaixo :

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

admin.initializeApp();

// IMPORTANTE: Obtenha uma chave grátis em https://resend.com/
const resend = new Resend('SUBSTITUA_PELA_SUA_CHAVE_RESEND');

export const sendWeeklyReport = functions.pubsub
  .schedule('0 8 * * 1') // Todos os lundis às 08:00
  .timeZone('Europe/Lisbon')
  .onRun(async (context) => {
    const db = admin.firestore();
    
    // Calcular data de 7 dias atrás
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);

    // Buscar encomendas (incluindo as ocultas 'pizzeria_hidden')
    const snapshot = await db.collection('orders')
      .where('created_at', '>=', last7Days.toISOString())
      .get();

    if (snapshot.empty) {
      console.log('Nenhuma encomenda esta semana.');
      return null;
    }

    // Gerar CSV
    let csvContent = '\ufeffNumero;Data;Cliente;Total;Estado;Tipo\n';
    let totalRevenue = 0;

    snapshot.forEach(doc => {
      const order = doc.data();
      totalRevenue += order.total;
      const type = order.delivery_type === 'delivery' ? 'Entrega' : 'Levantamento';
      csvContent += `${order.order_number};${order.created_at};${order.user.full_name};${order.total};${order.status};${type}\n`;
    });

    // Enviar Email para digismartpt@gmail.com
    try {
      await resend.emails.send({
        from: 'Relatorios <onboarding@resend.dev>',
        to: ['digismartpt@gmail.com'],
        subject: `📊 Relatório Semanal de Vendas - ${new Date().toLocaleDateString('pt-PT')}`,
        html: `
          <h1>Olá! Aqui está o seu relatório semanal</h1>
          <p>Estatísticas da última semana:</p>
          <ul>
            <li><strong>Total de Encomendas:</strong> ${snapshot.size}</li>
            <li><strong>Volume de Negócios:</strong> ${totalRevenue.toFixed(2)}€</li>
            <li><strong>Sua Comissão (estimada 10%):</strong> ${(totalRevenue * 0.1).toFixed(2)}€</li>
          </ul>
          <p>O ficheiro detalhado está em anexo para abrir no Excel.</p>
        `,
        attachments: [
          {
            filename: `relatorio_pizzaria_${new Date().toISOString().split('T')[0]}.csv`,
            content: Buffer.from(csvContent).toString('base64'),
          },
        ],
      });
      console.log('Relatório enviado com sucesso para digismartpt@gmail.com');
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }

    return null;
  });
```

**Nota:** Antes de gravar, instale a biblioteca Resend na pasta functions:
```bash
cd functions
npm install resend
cd ..
```

---

## 🚢 Passo 4: Fazer o Deploy (Ativação)

No seu terminal, execute o comando final:

```bash
firebase deploy --only functions
```

Uma vez concluído com sucesso, o script estará ativo e enviará o email automaticamente todos os lundis mattina às 08h00.

---

## ❓ Como testar antes de Segunda-feira?

Se quiser testar agora mesmo sem esperar por segunda-feira:
1. Vá à [Consola Firebase](https://console.firebase.google.com/).
2. Functions > procure por `sendWeeklyReport`.
3. Clique nos três pontos e selecione **"Force run"** (Executar agora).
4. Verifique o seu email!
