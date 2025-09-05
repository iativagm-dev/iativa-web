function formatear(valor, decimales = 2) {
    if (!valor || valor === 0) return '$0';
    if (valor < 0.01 && valor > 0) decimales = 6;
    else if (valor < 1 && valor > 0) decimales = 4;
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valor);
}

function calcular() {
    console.log('Calculando...');
    let totalMensual = 0;
    let detallesHTML = '';
    let hayServicios = false;
    
    const servicios = ['arriendo', 'internet', 'gas', 'agua', 'electricidad', 'otro'];
    const nombres = {
        'arriendo': '🏠 Arriendo',
        'internet': '🌐 Internet', 
        'gas': '🔥 Gas',
        'agua': '💧 Agua',
        'electricidad': '⚡ Electricidad',
        'otro': '📊 Otro'
    };
    
    servicios.forEach(servicio => {
        const input = document.getElementById(servicio);
        if (!input) return;
        
        const valor = parseFloat(input.value.replace(/[^\d.-]/g, ''));
        
        if (!isNaN(valor) && valor > 0) {
            const mensual = valor;
            const diario = mensual / 30;
            const porHora = diario / 24;
            const porMinuto = porHora / 60;
            const porSegundo = porMinuto / 60;

            totalMensual += mensual;
            hayServicios = true;
            
            detallesHTML += '<div class="bg-white rounded-lg shadow-lg p-6 border border-gray-200">';
            detallesHTML += '<h3 class="font-bold text-xl mb-4 text-gray-800">' + nombres[servicio] + '</h3>';
            detallesHTML += '<div class="space-y-3">';
            detallesHTML += '<div class="flex justify-between items-center"><span class="text-gray-600">💰 Mensual:</span><span class="font-semibold text-lg">' + formatear(mensual) + '</span></div>';
            detallesHTML += '<div class="flex justify-between items-center"><span class="text-gray-600">📅 Diario:</span><span class="font-semibold">' + formatear(diario) + '</span></div>';
            detallesHTML += '<div class="flex justify-between items-center"><span class="text-gray-600">⏰ Por hora:</span><span class="font-semibold">' + formatear(porHora) + '</span></div>';
            detallesHTML += '<div class="flex justify-between items-center"><span class="text-gray-600">⏱️ Por minuto:</span><span class="font-semibold">' + formatear(porMinuto, 4) + '</span></div>';
            detallesHTML += '<div class="flex justify-between items-center"><span class="text-gray-600">⚡ Por segundo:</span><span class="font-semibold">' + formatear(porSegundo, 6) + '</span></div>';
            detallesHTML += '</div></div>';
        }
    });

    if (hayServicios) {
        const totalDiario = totalMensual / 30;
        const totalPorHora = totalDiario / 24;
        const totalPorMinuto = totalPorHora / 60;
        const totalPorSegundo = totalPorMinuto / 60;

        document.getElementById('total-mensual').textContent = formatear(totalMensual);
        document.getElementById('total-diario').textContent = formatear(totalDiario);
        document.getElementById('total-hora').textContent = formatear(totalPorHora);
        document.getElementById('total-minuto').textContent = formatear(totalPorMinuto, 4);
        document.getElementById('total-segundo').textContent = formatear(totalPorSegundo, 6);

        document.getElementById('detalles').innerHTML = detallesHTML;
        document.getElementById('resultados').classList.remove('hidden');
        document.getElementById('mensaje-inicial').classList.add('hidden');
        
        console.log('Cálculo completado - Total: ' + formatear(totalMensual));
    } else {
        alert('Por favor ingresa al menos un valor válido para calcular los costos.');
    }
}

function ejemplo() {
    console.log('Cargando ejemplo...');
    
    document.getElementById('arriendo').value = '800000';
    document.getElementById('internet').value = '65000';
    document.getElementById('gas').value = '45000';
    document.getElementById('agua').value = '35000';
    document.getElementById('electricidad').value = '120000';
    document.getElementById('otro').value = '50000';
    
    setTimeout(calcular, 100);
    console.log('Ejemplo cargado y calculado');
}

function limpiar() {
    console.log('Limpiando formulario...');
    
    const servicios = ['arriendo', 'internet', 'gas', 'agua', 'electricidad', 'otro'];
    servicios.forEach(servicio => {
        const input = document.getElementById(servicio);
        if (input) {
            input.value = '';
        }
    });
    
    document.getElementById('resultados').classList.add('hidden');
    document.getElementById('mensaje-inicial').classList.remove('hidden');
    
    console.log('Formulario limpiado');
}

console.log('Calculadora de Costos por Tiempo iniciada correctamente');
