import type { MermaidConfig } from 'mermaid'

/**
 * Mermaidの設定を生成する
 */
export function getMermaidConfig(isDarkMode: boolean): MermaidConfig {
  const colors = getMermaidColors(isDarkMode)

  return {
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
    securityLevel: 'loose',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    flowchart: {
      useMaxWidth: false,
      htmlLabels: false, // HTMLラベルを無効化（<br/>のパースエラー対策）
      curve: 'basis',
      padding: 20,
      nodeSpacing: 80,
      rankSpacing: 80,
      diagramPadding: 30,
    },
    gantt: {
      useMaxWidth: false,
      fontSize: 14,
      sectionFontSize: 16,
    },
    sequence: {
      useMaxWidth: false,
    },
    themeVariables: colors,
    htmlLabels: false, // HTMLラベルを無効化
  }
}

/**
 * Mermaidのカラーテーマ設定
 */
function getMermaidColors(isDarkMode: boolean) {
  const lightColors = {
    primaryColor: '#cffafe',
    primaryTextColor: '#1f2937',
    primaryBorderColor: '#0891b2',
    lineColor: '#0891b2',
    secondaryColor: '#e0f2fe',
    tertiaryColor: '#f0f9ff',
    edgeLabelBackground: '#ffffff',
    nodeBorder: '#0891b2',
    mainBkg: '#cffafe',
    secondBkg: '#e0f2fe',
    tertiaryBorderColor: '#0891b2',
    // Sequence diagram
    actorBorder: '#0891b2',
    actorBkg: '#cffafe',
    actorTextColor: '#1f2937',
    actorLineColor: '#0891b2',
    signalColor: '#0891b2',
    signalTextColor: '#1f2937',
    labelBoxBkgColor: '#e0f2fe',
    labelBoxBorderColor: '#0891b2',
    labelTextColor: '#1f2937',
    activationBorderColor: '#0891b2',
    activationBkgColor: '#e0f2fe',
  }

  const darkColors = {
    primaryColor: '#0e7490',
    primaryTextColor: '#e5e7eb',
    primaryBorderColor: '#06b6d4',
    lineColor: '#06b6d4',
    secondaryColor: '#164e63',
    tertiaryColor: '#083344',
    edgeLabelBackground: '#1f2937',
    nodeBorder: '#06b6d4',
    mainBkg: '#0e7490',
    secondBkg: '#164e63',
    tertiaryBorderColor: '#06b6d4',
    // Sequence diagram
    actorBorder: '#06b6d4',
    actorBkg: '#0e7490',
    actorTextColor: '#e5e7eb',
    actorLineColor: '#06b6d4',
    signalColor: '#06b6d4',
    signalTextColor: '#e5e7eb',
    labelBoxBkgColor: '#164e63',
    labelBoxBorderColor: '#06b6d4',
    labelTextColor: '#e5e7eb',
    activationBorderColor: '#06b6d4',
    activationBkgColor: '#164e63',
  }

  return {
    fontSize: '16px',
    fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    ...(isDarkMode ? darkColors : lightColors),
  }
}
