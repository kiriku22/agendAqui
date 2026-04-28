import { useState } from 'react';
import PropTypes from 'prop-types';
import { TrendingUp } from 'lucide-react';
import Button from '../shared/Button';
import Input from '../shared/Input';
import './FiltrosReporte.css';

function FiltrosReporte({ onFiltrar, loading = false }) {
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [error, setError] = useState('');

  const setPeriodoRapido = (dias) => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - dias);

    setFechaHasta(hasta.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
    setFechaDesde(desde.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  };

  const handleGenerar = () => {
    if (!fechaDesde || !fechaHasta) {
      setError('Debes seleccionar ambas fechas');
      return;
    }
    if (new Date(fechaDesde) > new Date(fechaHasta)) {
      setError('La fecha inicial no puede ser mayor a la final');
      return;
    }

    setError('');
    onFiltrar({ fechaDesde, fechaHasta });
  };

  return (
    <div className="filtros-reporte">
      <div className="filtros-reporte__campos">
        <Input
          type="date"
          label="Desde"
          value={fechaDesde}
          onChange={(e) => setFechaDesde(e.target.value)}
        />
        <Input
          type="date"
          label="Hasta"
          value={fechaHasta}
          onChange={(e) => setFechaHasta(e.target.value)}
        />
        <Button
          onClick={handleGenerar}
          loading={loading}
          icon={<TrendingUp size={18} />}
        >
          Generar Reporte
        </Button>
      </div>

      <div className="filtros-reporte__rapidos">
        <span className="filtros-reporte__rapidos-label">Períodos rápidos:</span>
        <button onClick={() => setPeriodoRapido(7)}>Últimos 7 días</button>
        <button onClick={() => setPeriodoRapido(30)}>Últimos 30 días</button>
        <button onClick={() => setPeriodoRapido(90)}>Últimos 90 días</button>
      </div>

      {error && <div className="filtros-reporte__error">{error}</div>}
    </div>
  );
}

FiltrosReporte.propTypes = {
  onFiltrar: PropTypes.func.isRequired,
  loading: PropTypes.bool,
};

export default FiltrosReporte;
