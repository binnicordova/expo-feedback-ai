import { Animated, Keyboard, Modal, Pressable, Text, View } from "react-native";
import {
	initialWindowMetrics,
	SafeAreaProvider,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import type { FeedbAIComposerSheetProps } from "./FeedbAI.types";
import FeedbAIComposer from "./FeedbAIComposer";
import { useKeyboardInset, useSheetTransition } from "./useSheetAnimation";
import { useFeedbAITheme } from "./useTheme";

/**
 * The composer as its own sheet, sized to its content.
 *
 * Writing is a separate task from browsing, so it gets a separate surface: stacked
 * over `FeedbAISheet` rather than replacing it, so dismissing returns the user to the
 * board exactly where they left it. Usable on its own if you present the board some
 * other way.
 */
export default function FeedbAIComposerSheet({
	visible,
	onClose,
	title = "What would you love to see?",
	subtitle = "Rough words are fine — our AI engineer works out the details before building.",
	cancelLabel = "Cancel",
	titlePlaceholder,
	descriptionPlaceholder,
	submitLabel,
	onSubmit,
	style,
}: FeedbAIComposerSheetProps) {
	const { mounted, progress } = useSheetTransition(visible);

	const dismiss = () => {
		Keyboard.dismiss();
		onClose();
	};

	return (
		<Modal
			visible={mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={dismiss}
		>
			{/* Own provider: the sheet reads the insets of its own Modal, and consumers
			    are not required to have mounted a SafeAreaProvider at their root. */}
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<Sheet
					progress={progress}
					dismiss={dismiss}
					visible={visible}
					title={title}
					subtitle={subtitle}
					cancelLabel={cancelLabel}
					titlePlaceholder={titlePlaceholder}
					descriptionPlaceholder={descriptionPlaceholder}
					submitLabel={submitLabel}
					onSubmit={onSubmit}
					style={style}
				/>
			</SafeAreaProvider>
		</Modal>
	);
}

type SheetProps = Omit<FeedbAIComposerSheetProps, "onClose"> & {
	progress: Animated.Value;
	dismiss: () => void;
};

function Sheet({
	progress,
	dismiss,
	visible,
	title,
	subtitle,
	cancelLabel,
	titlePlaceholder,
	descriptionPlaceholder,
	submitLabel,
	onSubmit,
	style,
}: SheetProps) {
	const { styles } = useFeedbAITheme();
	const insets = useSafeAreaInsets();
	const keyboardInset = useKeyboardInset(insets.bottom);

	// The sheet sizes to its content, so it is slid by its own height rather than a
	// measured one: 600 is past the tallest this composer gets.
	const slide = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [600, 0],
	});

	return (
		<View style={styles.sheetRoot}>
			<Animated.View style={[styles.scrim, { opacity: progress }]}>
				<Pressable style={styles.scrim} onPress={dismiss} />
			</Animated.View>

			<Animated.View
				style={[
					styles.sheet,
					styles.composerSheet,
					style,
					{
						paddingBottom: insets.bottom + 16,
						transform: [
							{ translateY: slide },
							{ translateY: Animated.multiply(keyboardInset, -1) },
						],
					},
				]}
			>
				<View style={styles.sheetHeader}>
					<View style={styles.grabber} />
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close without sending"
						hitSlop={12}
						onPress={dismiss}
						style={({ pressed }) => [
							styles.sheetDismiss,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.sheetDismissLabel}>{cancelLabel}</Text>
					</Pressable>
				</View>

				<View style={styles.composerSheetTitleBlock}>
					<Text style={styles.sheetTitle}>{title}</Text>
					{subtitle ? (
						<Text style={styles.sheetSubtitle}>{subtitle}</Text>
					) : null}
				</View>

				<FeedbAIComposer
					autoFocus={visible}
					titlePlaceholder={titlePlaceholder}
					descriptionPlaceholder={descriptionPlaceholder}
					submitLabel={submitLabel}
					onSubmit={(feedback) => {
						onSubmit?.(feedback);
						dismiss();
					}}
				/>
			</Animated.View>
		</View>
	);
}
