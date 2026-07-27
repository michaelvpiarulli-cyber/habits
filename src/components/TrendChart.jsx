import { formatShort } from '../lib/dates';

const W = 300;
const H = 96;
const PAD_Y = 10;

/** Mean of the last `window` readings, which is what a weight trend actually is. */
function movingAverage(values, window = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
}

/**
 * A measure habit over time.
 *
 * Day-to-day weight swings on water, not fat, so the raw readings are drawn as
 * faint dots and the 7-day average as the solid line. The line is the signal;
 * the dots are there so a reading you remember taking is visibly present.
 */
export function TrendChart({ points, target, unit }) {
  if (points.length < 2) {
    return (
      <p className="trend__empty">
        {points.length === 1
          ? 'One reading so far — the trend line starts at two.'
          : 'No readings yet.'}
      </p>
    );
  }

  const values = points.map((p) => p.value);
  const avg = movingAverage(values);

  const candidates = [...values, ...(target ? [target] : [])];
  let lo = Math.min(...candidates);
  let hi = Math.max(...candidates);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.12;
  lo -= pad;
  hi += pad;

  const x = (i) => (i / (points.length - 1)) * W;
  const y = (v) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - PAD_Y * 2);

  const path = (series) => series.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');

  const first = values[0];
  const latest = values[values.length - 1];
  const change = latest - first;
  const latestAvg = avg[avg.length - 1];

  return (
    <div className="trend">
      <div className="trend__figures">
        <div>
          <p className="eyebrow">Latest</p>
          <p className="trend__value">
            {latest}
            <span className="trend__unit">{unit}</span>
          </p>
        </div>
        <div>
          <p className="eyebrow">7-day avg</p>
          <p className="trend__value trend__value--soft">
            {latestAvg.toFixed(1)}
            <span className="trend__unit">{unit}</span>
          </p>
        </div>
        <div>
          <p className="eyebrow">Since {formatShort(points[0].day)}</p>
          <p className={`trend__value trend__value--soft ${change < 0 ? 'is-down' : change > 0 ? 'is-up' : ''}`}>
            {change > 0 ? '+' : ''}
            {change.toFixed(1)}
            <span className="trend__unit">{unit}</span>
          </p>
        </div>
      </div>

      <svg
        className="trend__chart"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${points.length} readings from ${points[0].day} to ${points[points.length - 1].day}, latest ${latest} ${unit}`}
      >
        {target ? (
          <g className="trend__target">
            <line x1="0" y1={y(target)} x2={W} y2={y(target)} strokeDasharray="4 4" />
          </g>
        ) : null}

        <path className="trend__raw" d={path(values)} fill="none" />
        <path className="trend__avg" d={path(avg)} fill="none" />

        {points.map((p, i) => (
          <circle key={p.day} className="trend__dot" cx={x(i)} cy={y(p.value)} r="2" />
        ))}
      </svg>

      {target ? (
        <p className="trend__caption">
          Dashed line: goal {target} {unit}
        </p>
      ) : null}
    </div>
  );
}
