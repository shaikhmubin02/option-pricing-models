import { Chart as ChartJS, Title, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { MatrixController, MatrixElement } from 'chartjs-chart-matrix';
import { Chart } from 'react-chartjs-2';

ChartJS.register(Title, Tooltip, Legend, CategoryScale, LinearScale, MatrixController, MatrixElement);

// Component for Call Price Heatmap
const CallPriceHeatmap = ({ data }) => {
    const chartData = {
        labels: data.spot_prices.map(p => p.toFixed(2)),
        datasets: [
            {
                label: 'Call Prices',
                data: data.call_prices.flatMap((row, rowIndex) =>
                    row.map((value, colIndex) => ({
                        x: colIndex,
                        y: rowIndex,
                        v: value,
                    }))
                ),
                backgroundColor: 'rgba(75,192,192,0.6)',
                borderColor: 'rgba(75,192,192,1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `Value: ${context.raw.v}`;
                    },
                },
            },
        },
        scales: {
            x: {
                type: 'category',
                labels: data.spot_prices.map(p => p.toFixed(2)),
                title: {
                    display: true,
                    text: 'Spot Price',
                },
            },
            y: {
                type: 'category',
                labels: data.volatilities.map(v => v.toFixed(2)),
                title: {
                    display: true,
                    text: 'Volatility',
                },
            },
        },
    };

    return (
        <div>
            <Chart type='matrix' data={chartData} options={options} />
        </div>
    );
};

// Component for Put Price Heatmap
const PutPriceHeatmap = ({ data }) => {
    const chartData = {
        labels: data.spot_prices.map(p => p.toFixed(2)),
        datasets: [
            {
                label: 'Put Prices',
                data: data.put_prices.flatMap((row, rowIndex) =>
                    row.map((value, colIndex) => ({
                        x: colIndex,
                        y: rowIndex,
                        v: value,
                    }))
                ),
                backgroundColor: 'rgba(255,99,132,0.6)',
                borderColor: 'rgba(255,99,132,1)',
                borderWidth: 1,
            },
        ],
    };

    const options = {
        plugins: {
            legend: {
                display: true,
                position: 'top',
            },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `Value: ${context.raw.v}`;
                    },
                },
            },
        },
        scales: {
            x: {
                type: 'category',
                labels: data.spot_prices.map(p => p.toFixed(2)),
                title: {
                    display: true,
                    text: 'Spot Price',
                },
            },
            y: {
                type: 'category',
                labels: data.volatilities.map(v => v.toFixed(2)),
                title: {
                    display: true,
                    text: 'Volatility',
                },
            },
        },
    };

    return (
        <div>
            <Chart type='matrix' data={chartData} options={options} />
        </div>
    );
};

export { CallPriceHeatmap, PutPriceHeatmap };
