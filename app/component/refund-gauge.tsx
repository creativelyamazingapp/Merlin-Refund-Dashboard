import React, { Suspense, lazy, memo } from "react";

const GaugeChart = lazy(() => import("react-gauge-chart"));

interface RefundGaugeProps {
  totalSales: number;
  totalRefunds: number;
  isSalesGauge?: boolean;
}

const RefundGauge: React.FC<RefundGaugeProps> = ({
  totalSales,
  totalRefunds,
  isSalesGauge = false,
}) => {
  const percentage = totalSales > 0 ? totalRefunds / totalSales : 0;
  const gaugeColors = isSalesGauge ? ["#FF0000", "#00FF00"] : ["#00FF00", "#FF0000"];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Suspense fallback={<div>Loading...</div>}>
        <GaugeChart
          id="refund-gauge"
          nrOfLevels={30}
          percent={percentage}
          textColor="#000000"
          colors={gaugeColors}
        />
      </Suspense>
    </div>
  );
};

export default memo(RefundGauge);


// import React, { Suspense, lazy } from "react";

// const GaugeChart = lazy(() => import("react-gauge-chart"));

// interface RefundGaugeProps {
//   totalSales: number;
//   totalRefunds: number;
// }

// const RefundGauge: React.FC<RefundGaugeProps> = ({
//   totalSales,
//   totalRefunds,
// }) => {
//   const percentage = totalSales > 0 ? totalRefunds / totalSales : 0;

//   return (
//     <div style={{ width: "100%" }}>
//       <Suspense fallback={<div>Loading...</div>}>
//         <GaugeChart
//           id="refund-gauge"
//           nrOfLevels={30}
//           percent={percentage}
//           textColor="#000000"
//         />
//       </Suspense>
//     </div>
//   );
// };

// export default RefundGauge;

// import React from "react";
// import Gauge from "react-svg-gauge";

// interface RefundGaugeProps {
//   totalSales: number;
//   totalRefunds: number;
// }

// const RefundGauge: React.FC<RefundGaugeProps> = ({
//   totalSales,
//   totalRefunds,
// }) => {
//   const percentage = totalRefunds / totalSales;

//   return (
//     <div style={{ width: "100%" }}>
//       <Gauge
//         value={percentage * 100}
//         width={400}
//         height={180}
//         label="Refund Percentage"
//         min={0}
//         max={100}
//         color="#FF0000"
//       />
//       <div style={{ textAlign: "center", marginTop: "10px" }}>
//         {/* <p>Total Sales: ${totalSales.toFixed(2)}</p>
//         <p>Total Refunds: ${totalRefunds.toFixed(2)}</p> */}
//         <p>Refund Percentage: {(percentage * 100).toFixed(2)}%</p>
//       </div>
//     </div>
//   );
// };

// export default RefundGauge;
