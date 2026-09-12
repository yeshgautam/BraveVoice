import { StyleSheet, Text, View } from 'react-native';

import { TherapistPalette } from '@/constants/therapist-theme';

const BodySemibold = 'Nunito_600SemiBold';
const CHART_HEIGHT = 150;

type Point = { x: number; y: number };

function toPoints(values: number[], width: number): Point[] {
  return values.map((v, i) => ({
    x: (i / (values.length - 1)) * width,
    y: CHART_HEIGHT - (v / 100) * CHART_HEIGHT,
  }));
}

function Segment({ a, b, color, thickness = 2.5 }: { a: Point; b: Point; color: string; thickness?: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  return (
    <View
      style={{
        position: 'absolute',
        left: midX - length / 2,
        top: midY - thickness / 2,
        width: length,
        height: thickness,
        backgroundColor: color,
        borderRadius: thickness / 2,
        transform: [{ rotate: `${angle}deg` }],
      }}
    />
  );
}

export function ClassFluencyLineChart({
  width,
  classAverage,
  target,
  xLabels,
  seriesLabel = 'Class Average',
}: {
  width: number;
  classAverage: number[];
  target: number[];
  xLabels: string[];
  seriesLabel?: string;
}) {
  const avgPoints = toPoints(classAverage, width);
  const targetY = CHART_HEIGHT - (target[0] / 100) * CHART_HEIGHT;
  const dashCount = 24;

  return (
    <View>
      <View style={[styles.chartArea, { width, height: CHART_HEIGHT }]}>
        <View style={[styles.gridLine, { top: 0 }]} />
        <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
        <View style={[styles.gridLine, { top: CHART_HEIGHT - 1 }]} />

        {Array.from({ length: dashCount }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dash,
              { left: (i * width) / dashCount, top: targetY - 1 },
            ]}
          />
        ))}

        {avgPoints.slice(0, -1).map((p, i) => (
          <Segment key={i} a={p} b={avgPoints[i + 1]} color={TherapistPalette.brandBlue} />
        ))}
        {avgPoints.map((p, i) => (
          <View key={i} style={[styles.dot, { left: p.x - 4, top: p.y - 4 }]} />
        ))}
      </View>

      <View style={[styles.xLabelRow, { width }]}>
        {xLabels.map((label) => (
          <Text key={label} style={styles.xLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: TherapistPalette.brandBlue }]} />
          <Text style={styles.legendText}>{seriesLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDash, { backgroundColor: TherapistPalette.coral }]} />
          <Text style={styles.legendText}>Target Score</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chartArea: {
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: TherapistPalette.border,
  },
  dash: {
    position: 'absolute',
    width: 6,
    height: 2,
    backgroundColor: TherapistPalette.coral,
    borderRadius: 1,
  },
  dot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TherapistPalette.brandBlue,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  xLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  xLabel: {
    fontFamily: BodySemibold,
    fontSize: 11,
    color: TherapistPalette.textMuted,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 14,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDash: {
    width: 12,
    height: 3,
    borderRadius: 1.5,
  },
  legendText: {
    fontFamily: BodySemibold,
    fontSize: 12,
    color: TherapistPalette.textMuted,
  },
});
