declare module 'react-gauge-chart' {
  import { ComponentType } from 'react';

  interface GaugeChartProps {
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    textColor?: string;
    nrOfLevels?: number;
    percent?: number;
    arcPadding?: number;
    cornerRadius?: number;
    arcWidth?: number;
    colors?: string[];
    arcsLength?: number[];
    needleColor?: string;
    needleBaseColor?: string;
    animate?: boolean;
    animationDuration?: number;
    formatTextValue?: (value: string) => string;
  }

  const GaugeChart: ComponentType<GaugeChartProps>;

  export default GaugeChart;
}
