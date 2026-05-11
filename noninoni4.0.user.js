// ==UserScript==
// @name         CSJN - Antigüedad REAL del Expediente
// @namespace    http://tampermonkey.net/
// @version      4.0
// @description  Calcula antigüedad desde el año del expediente hasta la fecha de sentencia
// @match        https://www.csjn.gov.ar/tribunales-federales-nacionales/inicio.html*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // =========================
    // OBTENER AÑO EXPEDIENTE
    // =========================
    function obtenerAnioExpediente(div) {

        const expedienteLi = [...div.querySelectorAll('li')]
            .find(li => li.innerText.includes('Expediente N°:'));

        if (!expedienteLi) return null;

        const texto = expedienteLi.innerText;

        /*
            Soporta:

            CAF 012498/2020
            CAF 001037/2024/CA001
            FSM 12345/2018
        */

        const match = texto.match(/\/(\d{4})(?:\/|$)/);

        if (!match) return null;

        const anio = parseInt(match[1], 10);

        if (anio < 1900 || anio > 2100) return null;

        return anio;
    }

    // =========================
    // OBTENER FECHA SENTENCIA
    // =========================
    function obtenerFechaSentencia(div) {

        const fechaLi = [...div.querySelectorAll('li')]
            .find(li => li.innerText.includes('Fecha de sentencia:'));

        if (!fechaLi) return null;

        const texto = fechaLi.innerText;

        const match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);

        if (!match) return null;

        const dia = parseInt(match[1], 10);
        const mes = parseInt(match[2], 10) - 1;
        const anio = parseInt(match[3], 10);

        return new Date(anio, mes, dia);
    }

    // =========================
    // ANTIGÜEDAD REAL
    // =========================
    function calcularAntiguedad(anioExpediente, fechaSentencia) {

        const fechaInicio = new Date(anioExpediente, 0, 1);

        let anios =
            fechaSentencia.getFullYear() - fechaInicio.getFullYear();

        // Ajuste fino por mes/día
        const mesSent = fechaSentencia.getMonth();
        const diaSent = fechaSentencia.getDate();

        if (
            mesSent < 0 ||
            (mesSent === 0 && diaSent < 1)
        ) {
            anios--;
        }

        return Math.max(anios, 0);
    }

    // =========================
    // LEER RESULTADOS
    // =========================
    function obtenerResultados() {

        const resultados = [];

        document.querySelectorAll('div.result').forEach(div => {

            const anioExpediente = obtenerAnioExpediente(div);

            const fechaSentencia = obtenerFechaSentencia(div);

            if (!anioExpediente || !fechaSentencia) return;

            const antiguedad =
                calcularAntiguedad(anioExpediente, fechaSentencia);

            resultados.push({
                div,
                anioExpediente,
                fechaSentencia,
                antiguedad
            });
        });

        return resultados;
    }

    // =========================
    // RENDER
    // =========================
    function procesar() {

        const resultados = obtenerResultados();

        if (resultados.length === 0) return;

        const promedio =
            resultados.reduce((acc, r) => acc + r.antiguedad, 0)
            / resultados.length;

        resultados.forEach(r => {

            const div = r.div;

            // elimina banner previo
            const viejo = div.querySelector('.antiguedad-expediente');

            if (viejo) viejo.remove();

            const diferencia = r.antiguedad - promedio;

            let comparacion = '';
            let color = '';
            let borde = '';

            if (diferencia > 0) {

                const porcentaje =
                    promedio === 0
                        ? 100
                        : ((diferencia / promedio) * 100);

                comparacion =
                    `⬆ ${porcentaje.toFixed(1)}% POR ENCIMA del promedio`;

                color = '#ffe3e3';
                borde = '#d66';

            } else if (diferencia < 0) {

                const porcentaje =
                    promedio === 0
                        ? 100
                        : ((Math.abs(diferencia) / promedio) * 100);

                comparacion =
                    `⬇ ${porcentaje.toFixed(1)}% POR DEBAJO del promedio`;

                color = '#e3ffe3';
                borde = '#4a4';

            } else {

                comparacion = '＝ EXACTAMENTE EN EL PROMEDIO';

                color = '#ededed';
                borde = '#999';
            }

            const fechaTexto =
                r.fechaSentencia.toLocaleDateString('es-AR');

            const banner = document.createElement('div');

            banner.className = 'antiguedad-expediente';

            banner.innerHTML = `
                <div style="
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 6px;
                ">
                    📌 ${r.antiguedad} año${r.antiguedad !== 1 ? 's' : ''}
                </div>

                <div style="font-size:14px;">
                    Expediente: ${r.anioExpediente}
                </div>

                <div style="
                    font-size:14px;
                    margin-top:2px;
                ">
                    Sentencia: ${fechaTexto}
                </div>

                <div style="
                    font-size:14px;
                    margin-top:6px;
                    opacity:0.9;
                ">
                    Promedio general: ${promedio.toFixed(1)} años
                </div>

                <div style="
                    margin-top:8px;
                    font-size:15px;
                    font-weight:bold;
                ">
                    ${comparacion}
                </div>
            `;

            banner.style.cssText = `
                background: ${color};
                border: 2px solid ${borde};
                color: #222;
                padding: 12px;
                margin-bottom: 12px;
                border-radius: 10px;
                text-align: center;
                font-family: Arial, sans-serif;
                box-shadow: 0 2px 6px rgba(0,0,0,0.08);
            `;

            div.prepend(banner);
        });
    }

    // =========================
    // OBSERVER DINÁMICO
    // =========================
    function iniciarObserver() {

        let timeout;

        const observer = new MutationObserver(() => {

            clearTimeout(timeout);

            timeout = setTimeout(() => {
                procesar();
            }, 400);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    procesar();
    iniciarObserver();

})();
