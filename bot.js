const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const schedule = require('node-schedule');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: [
            '--no-sandbox', 
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ] 
    }
});

let tarefas = [];

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escaneie o QR Code acima com o seu WhatsApp!');
});

client.on('ready', () => {
    console.log('Assistente conectado e pronto para agendar tarefas!');
});

client.on('message_create', async (msg) => {
    const texto = msg.body.toLowerCase();

    if (texto === '!tarefas') {
        if (tarefas.length === 0) {
            msg.reply('Você não tem nenhuma tarefa agendada no momento. 🏖️');
            return;
        }
        let resposta = '*Suas Tarefas Pendentes:*\n\n';
        tarefas.forEach((t, index) => {
            resposta += `${index + 1}. ${t.nome} (em ${t.dataStr})\n`;
        });
        msg.reply(resposta);
    }

    if (texto.startsWith('!lembrar ')) {
        try {
            const partes = msg.body.substring(9).split(' - ');
            const dataStr = partes[0].trim();
            const nomeTarefa = partes[1].trim();
            const [data, hora] = dataStr.split(' ');
            const [dia, mes, ano] = data.split('/');
            const [horaExata, minuto] = hora.split(':');
            const dataAgendada = new Date(ano, mes - 1, dia, horaExata, minuto);

            if (dataAgendada < new Date()) {
                msg.reply('❌ Essa data já passou! Tente agendar para o futuro.');
                return;
            }

            tarefas.push({ nome: nomeTarefa, dataStr: dataStr });

            schedule.scheduleJob(dataAgendada, () => {
                client.sendMessage(msg.to, `🔔 *LEMBRETE:* Está na hora de: ${nomeTarefa}`);
                tarefas = tarefas.filter(t => t.nome !== nomeTarefa);
            });

            msg.reply(`✅ Tarefa agendada com sucesso!\nVou te lembrar de "${nomeTarefa}" no dia ${dataStr}.`);
        } catch (erro) {
            msg.reply('❌ Formato incorreto. Use exatamente assim:\n!lembrar DD/MM/AAAA HH:MM - Nome da tarefa');
        }
    }
});

client.initialize();
