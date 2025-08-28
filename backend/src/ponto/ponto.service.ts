import { Injectable } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

type SemanaData = {
  semana: string;
  dias: number[];
  total: number;
  meta: number;
};

@Injectable()
export class PontoService {
  private getWeekKey(dateStr: string) {
    const [data] = dateStr.split(' - ');
    const [dia, mes, ano] = data.split('/').map(Number);
    const date = new Date(ano, mes - 1, dia);
    const firstDayOfWeek = new Date(date);
    firstDayOfWeek.setDate(date.getDate() - date.getDay());
    return firstDayOfWeek.toISOString().split('T')[0];
  }

  private diaDaSemanaIndex(dateStr: string) {
    const [data] = dateStr.split(' - ');
    const [dia, mes, ano] = data.split('/').map(Number);
    const date = new Date(ano, mes - 1, dia);
    return date.getDay();
  }

  private async extrairDiasDeTrabalho(page: puppeteer.Page) {
    await page.waitForSelector("td[label='Data']");
    return page.evaluate(() => {
      const linhas = Array.from(document.querySelectorAll("tr.maozinha"));
      const resultados: { data: string; horas: number }[] = [];

      for (const linha of linhas) {
        const tds = linha.querySelectorAll("td");
        if (tds.length < 3) continue;

        const data = tds[0].textContent?.trim() || '';
        const marcacoes = Array.from(tds[2].querySelectorAll("span"))
          .map(s => s.textContent?.trim() || '')
          .filter(t => /^\d{2}:\d{2}$/.test(t));

        let minutosTotais = 0;
        for (let i = 0; i < marcacoes.length; i += 2) {
          const entrada = marcacoes[i];
          const saida = marcacoes[i + 1];
          if (!saida) continue;

          const [h1, m1] = entrada.split(":").map(Number);
          const [h2, m2] = saida.split(":").map(Number);
          minutosTotais += (h2 * 60 + m2) - (h1 * 60 + m1);
        }

        resultados.push({ data, horas: +(minutosTotais / 60).toFixed(2) });
      }
      return resultados;
    });
  }

  private async coletarSemanas(page: puppeteer.Page) {
    let dias: { data: string; horas: number }[] = [];

    // --- Voltar até não ter mais ---
    let temAnterior = true;
    while (temAnterior) {
      const diasPagina = await this.extrairDiasDeTrabalho(page);
      dias = [...diasPagina, ...dias];

      const linkAnterior = await page.$('a[style*="float:left"]');
      if (linkAnterior) {
        const antes = await page.$eval("td[label='Data']", el => el.textContent?.trim());
        await Promise.all([
          linkAnterior.click(),
          page.waitForFunction(
            old => {
              const el = document.querySelector("td[label='Data']");
              return el && el.textContent?.trim() !== old;
            },
            {},
            antes,
          ),
        ]);
      } else temAnterior = false;
    }

    // --- Ir para frente até não ter mais ---
    await page.goto("https://rh.zaffari.com.br/core/Ponto/Consulta");
    await page.waitForSelector("td[label='Data']");
    let temProximo = true;
    while (temProximo) {
      const diasPagina = await this.extrairDiasDeTrabalho(page);
      dias = [...dias, ...diasPagina];

      const linkProximo = await page.$('a[style*="float:right"]');
      if (linkProximo) {
        const antes = await page.$eval("td[label='Data']", el => el.textContent?.trim());
        await Promise.all([
          linkProximo.click(),
          page.waitForFunction(
            old => {
              const el = document.querySelector("td[label='Data']");
              return el && el.textContent?.trim() !== old;
            },
            {},
            antes,
          ),
        ]);
      } else temProximo = false;
    }

    return dias;
  }

  async getPontoData(usuario: string, senha: string): Promise<SemanaData[]> {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    await page.goto('https://rh.zaffari.com.br/auth/Account/Login');
    await page.waitForSelector("#txtIdentificacao");
    await page.type("#txtIdentificacao", usuario);
    await page.type("#senha", senha);
    await page.keyboard.press("Enter");

    await page.waitForNavigation();
    await page.goto("https://rh.zaffari.com.br/core/Ponto/Consulta");

    const diasDeTrabalho = await this.coletarSemanas(page);

    // Agrupar por semana
    const semanas: Record<string, number[]> = {};
    diasDeTrabalho.forEach(dia => {
      const semanaKey = this.getWeekKey(dia.data);
      const diaIndex = this.diaDaSemanaIndex(dia.data);
      if (!semanas[semanaKey]) semanas[semanaKey] = new Array(7).fill(0);
      semanas[semanaKey][diaIndex] = dia.horas;
    });

    const resultadoFinal: SemanaData[] = Object.entries(semanas).map(([semana, dias]) => ({
      semana,
      dias,
      total: dias.reduce((a, b) => a + b, 0),
      meta: 44,
    }));

    await browser.close();
    return resultadoFinal;
  }
}
