const os = require("os");

function getSystemMetrics() {

    const totalMemory = os.totalmem();

    const freeMemory = os.freemem();

    const usedMemory =
        totalMemory - freeMemory;

    const memoryUsage =
        (usedMemory / totalMemory) * 100;

    const cpus = os.cpus();

    const cpuUsage =
        cpus.reduce(
            (total, cpu) => {

                const times = cpu.times;

                const totalTime =
                    times.user +
                    times.nice +
                    times.sys +
                    times.idle +
                    times.irq;

                const busyTime =
                    totalTime - times.idle;

                return total +
                    (busyTime / totalTime) * 100;
            },
            0
        ) / cpus.length;

    return {
        cpuUsage: Number(
            cpuUsage.toFixed(2)
        ),

        memoryUsage: Number(
            memoryUsage.toFixed(2)
        ),

        totalMemory,
        freeMemory,
        uptime: os.uptime()
    };
}

module.exports = {
    getSystemMetrics
};