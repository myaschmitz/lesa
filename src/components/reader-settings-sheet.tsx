import { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSettingsStore, type PdfFit } from '@/store/settings-store';
import {
  resolveThemeTokens,
  THEME_LABELS,
  Themes,
  type ReaderThemeName,
  type ThemeTokens,
} from '@/theme/themes';
import {
  FONT_FAMILIES,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_STEP,
} from '@/theme/typography';
import type { BookFormat } from '@/types/book';

const THEME_ORDER: ReaderThemeName[] = ['system', 'light', 'sepia', 'white', 'dark', 'black'];
const PDF_FITS: { value: PdfFit; label: string }[] = [
  { value: 'width', label: 'Fit width' },
  { value: 'height', label: 'Fit height' },
  { value: 'both', label: 'Whole page' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Drives whether typography controls are interactive (PDF = greyed out). */
  format: BookFormat;
}

/**
 * In-reader settings surface. Global reader prefs live in the settings store and
 * apply to both engines; this sheet just edits them. Typography is greyed out for
 * PDFs (fixed layout — font controls don't apply); PDF-only mode controls appear
 * only for PDFs.
 */
export function ReaderSettingsSheet({ visible, onClose, format }: Props) {
  const scheme = useColorScheme();
  const themeName = useSettingsStore((s) => s.themeName);
  const tokens = useMemo(
    () => resolveThemeTokens(themeName, scheme === 'dark'),
    [themeName, scheme],
  );
  const isPdf = format === 'pdf';

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close settings" />
      <View style={[styles.sheet, { backgroundColor: tokens.backgroundElement }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={[styles.title, { color: tokens.text }]}>Reading</Text>
          <Pressable onPress={onClose} accessibilityLabel="Done">
            <Text style={[styles.done, { color: tokens.text }]}>Done</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <ThemeSection tokens={tokens} />
          <TypographySection tokens={tokens} disabled={isPdf} />
          {isPdf ? <PdfSection tokens={tokens} /> : null}
          <ResetButton tokens={tokens} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function ThemeSection({ tokens }: { tokens: ThemeTokens }) {
  const themeName = useSettingsStore((s) => s.themeName);
  const setThemeName = useSettingsStore((s) => s.setThemeName);

  return (
    <Section title="Theme" tokens={tokens}>
      <View style={styles.swatches}>
        {THEME_ORDER.map((name) => {
          const t = name === 'system' ? Themes.light : Themes[name];
          const selected = themeName === name;
          return (
            <Pressable
              key={name}
              accessibilityLabel={`${THEME_LABELS[name]} theme`}
              onPress={() => setThemeName(name)}
              style={[
                styles.swatch,
                {
                  backgroundColor: t.background,
                  borderColor: selected ? tokens.text : t.backgroundSelected,
                },
                selected && styles.swatchSelected,
              ]}
            >
              <Text style={[styles.swatchLabel, { color: t.text }]}>Aa</Text>
              <Text style={[styles.swatchName, { color: tokens.textSecondary }]}>
                {THEME_LABELS[name]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Section>
  );
}

function TypographySection({ tokens, disabled }: { tokens: ThemeTokens; disabled: boolean }) {
  const fontFamily = useSettingsStore((s) => s.fontFamily);
  const fontSize = useSettingsStore((s) => s.fontSize);
  const lineHeight = useSettingsStore((s) => s.lineHeight);
  const setFontFamily = useSettingsStore((s) => s.setFontFamily);
  const setFontSize = useSettingsStore((s) => s.setFontSize);
  const setLineHeight = useSettingsStore((s) => s.setLineHeight);

  return (
    <Section
      title="Typography"
      tokens={tokens}
      subtitle={disabled ? 'Fixed layout — not adjustable for PDFs' : undefined}
      disabled={disabled}
    >
      <SegmentedRow
        tokens={tokens}
        disabled={disabled}
        options={FONT_FAMILIES.map((f) => ({ value: f.value, label: f.label }))}
        selected={fontFamily}
        onSelect={setFontFamily}
      />
      <Stepper
        tokens={tokens}
        disabled={disabled}
        label="Size"
        value={`${fontSize}%`}
        onDec={() => setFontSize(fontSize - FONT_SIZE_STEP)}
        onInc={() => setFontSize(fontSize + FONT_SIZE_STEP)}
        canDec={fontSize > FONT_SIZE_MIN}
        canInc={fontSize < FONT_SIZE_MAX}
      />
      <Stepper
        tokens={tokens}
        disabled={disabled}
        label="Spacing"
        value={lineHeight.toFixed(1)}
        onDec={() => setLineHeight(lineHeight - LINE_HEIGHT_STEP)}
        onInc={() => setLineHeight(lineHeight + LINE_HEIGHT_STEP)}
        canDec={lineHeight > LINE_HEIGHT_MIN}
        canInc={lineHeight < LINE_HEIGHT_MAX}
      />
    </Section>
  );
}

function PdfSection({ tokens }: { tokens: ThemeTokens }) {
  const pdfPaging = useSettingsStore((s) => s.pdfPaging);
  const pdfFit = useSettingsStore((s) => s.pdfFit);
  const setPdfPaging = useSettingsStore((s) => s.setPdfPaging);
  const setPdfFit = useSettingsStore((s) => s.setPdfFit);

  return (
    <Section title="PDF" tokens={tokens}>
      <SegmentedRow
        tokens={tokens}
        options={[
          { value: 'scroll', label: 'Scroll' },
          { value: 'page', label: 'Page' },
        ]}
        selected={pdfPaging ? 'page' : 'scroll'}
        onSelect={(v) => setPdfPaging(v === 'page')}
      />
      <SegmentedRow
        tokens={tokens}
        options={PDF_FITS}
        selected={pdfFit}
        onSelect={(v) => setPdfFit(v as PdfFit)}
      />
    </Section>
  );
}

function ResetButton({ tokens }: { tokens: ThemeTokens }) {
  const resetAll = useSettingsStore((s) => s.resetAll);
  return (
    <Pressable
      onPress={resetAll}
      accessibilityLabel="Reset to defaults"
      style={[styles.reset, { borderColor: tokens.backgroundSelected }]}
    >
      <Text style={[styles.resetText, { color: tokens.textSecondary }]}>Reset to defaults</Text>
    </Pressable>
  );
}

function Section({
  title,
  subtitle,
  tokens,
  disabled,
  children,
}: {
  title: string;
  subtitle?: string;
  tokens: ThemeTokens;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, disabled && styles.dimmed]}>
      <Text style={[styles.sectionTitle, { color: tokens.textSecondary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: tokens.textSecondary }]}>{subtitle}</Text>
      ) : null}
      {children}
    </View>
  );
}

function SegmentedRow({
  tokens,
  options,
  selected,
  onSelect,
  disabled,
}: {
  tokens: ThemeTokens;
  options: { value: string; label: string }[];
  selected: string;
  onSelect: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <View style={[styles.segments, { backgroundColor: tokens.background }]}>
      {options.map((opt) => {
        const active = opt.value === selected;
        return (
          <Pressable
            key={opt.value}
            disabled={disabled}
            onPress={() => onSelect(opt.value)}
            style={[styles.segment, active && { backgroundColor: tokens.backgroundSelected }]}
          >
            <Text style={[styles.segmentText, { color: tokens.text }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({
  tokens,
  label,
  value,
  onDec,
  onInc,
  canDec,
  canInc,
  disabled,
}: {
  tokens: ThemeTokens;
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  canDec: boolean;
  canInc: boolean;
  disabled?: boolean;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: tokens.text }]}>{label}</Text>
      <View style={styles.stepperControls}>
        <StepButton tokens={tokens} text="−" onPress={onDec} disabled={disabled || !canDec} />
        <Text style={[styles.stepperValue, { color: tokens.text }]}>{value}</Text>
        <StepButton tokens={tokens} text="+" onPress={onInc} disabled={disabled || !canInc} />
      </View>
    </View>
  );
}

function StepButton({
  tokens,
  text,
  onPress,
  disabled,
}: {
  tokens: ThemeTokens;
  text: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.stepBtn, { backgroundColor: tokens.background }, disabled && styles.dimmed]}
    >
      <Text style={[styles.stepBtnText, { color: tokens.text }]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: Spacing.four,
    borderTopRightRadius: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    maxHeight: '80%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#88888855',
    marginTop: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.three,
  },
  title: { fontSize: 20, fontWeight: '600' },
  done: { fontSize: 16, fontWeight: '600' },
  body: { gap: Spacing.four, paddingBottom: Spacing.three },
  section: { gap: Spacing.two },
  dimmed: { opacity: 0.4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionSubtitle: { fontSize: 12 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  swatch: {
    width: 64,
    height: 64,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  swatchSelected: { borderWidth: 2.5 },
  swatchLabel: { fontSize: 20, fontWeight: '600' },
  swatchName: { fontSize: 10 },
  segments: { flexDirection: 'row', borderRadius: Spacing.three, padding: 2 },
  segment: {
    flex: 1,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three - 2,
    alignItems: 'center',
  },
  segmentText: { fontSize: 14, fontWeight: '600' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stepperLabel: { fontSize: 15 },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  stepperValue: { fontSize: 15, minWidth: 48, textAlign: 'center' },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 22, fontWeight: '600' },
  reset: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  resetText: { fontSize: 15, fontWeight: '600' },
});
