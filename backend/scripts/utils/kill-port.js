const { exec } = require('child_process');

exec('netstat -ano | findstr :4003', (err, stdout) => {
  const match = stdout.match(/LISTENING\s+(\d+)/);
  if (match) {
    const pid = match[1];
    console.log('Matando proceso:', pid);
    exec(`taskkill /PID ${pid} /F`, (e, output, stderr) => {
      if (e) {
        console.error('Error:', stderr || e.message);
      } else {
        console.log('Proceso terminado:', output);
      }
    });
  } else {
    console.log('Puerto 4003 está libre');
  }
});
