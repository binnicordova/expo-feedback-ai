import { useEffect, useState } from "react";
import {
	Animated,
	Modal,
	Pressable,
	Text,
	useWindowDimensions,
	View,
} from "react-native";
import {
	initialWindowMetrics,
	SafeAreaProvider,
	useSafeAreaInsets,
} from "react-native-safe-area-context";
import { RANK_CYCLE_MS } from "../constants/env";
import { ComposeIcon } from "../icons";
import { cadenceLabel } from "../utils/format";
import type { FeedbAISheetProps } from "./FeedbAI.types";
import FeedbAIComposerSheet from "./FeedbAIComposerSheet";
import FeedbAIList from "./FeedbAIList";
import { useSheetTransition } from "./useSheetAnimation";
import { useFeedbAITheme } from "./useTheme";

/**
 * The whole board as a bottom sheet: heading, ranked list, and a floating button that
 * stacks the composer on top. This is the drop-in — `<FeedbAISheet visible onClose />`
 * next to your own trigger is the entire integration.
 *
 * Dependency-free by design (`Modal` + `Animated`), so adding the board does not push
 * a sheet library into an app that has its own. Want a different presentation? Compose
 * `FeedbAIList` and `FeedbAIComposer` yourself; they are exported for exactly that.
 */
export default function FeedbAISheet({
	visible,
	onClose,
	title = "Ideas for this app",
	subtitle,
	closeLabel = "Close",
	composeLabel = "Share an idea",
	heightRatio = 0.92,
	emptyLabel,
	onVote,
	onItemPress,
	onSubmit,
	composerProps,
	style,
	itemStyle,
}: FeedbAISheetProps) {
	const { mounted, progress } = useSheetTransition(visible);

	return (
		<Modal
			visible={mounted}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			{/* Own provider: the sheet reads the insets of its own Modal, and consumers
			    are not required to have mounted a SafeAreaProvider at their root. */}
			<SafeAreaProvider initialMetrics={initialWindowMetrics}>
				<Sheet
					progress={progress}
					visible={visible}
					onClose={onClose}
					title={title}
					subtitle={subtitle}
					closeLabel={closeLabel}
					composeLabel={composeLabel}
					heightRatio={heightRatio}
					emptyLabel={emptyLabel}
					onVote={onVote}
					onItemPress={onItemPress}
					onSubmit={onSubmit}
					composerProps={composerProps}
					style={style}
					itemStyle={itemStyle}
				/>
			</SafeAreaProvider>
		</Modal>
	);
}

type SheetProps = FeedbAISheetProps & { progress: Animated.Value };

function Sheet({
	progress,
	visible,
	onClose,
	title,
	subtitle,
	closeLabel,
	composeLabel,
	heightRatio = 0.92,
	emptyLabel,
	onVote,
	onItemPress,
	onSubmit,
	composerProps,
	style,
	itemStyle,
}: SheetProps) {
	const { theme, styles } = useFeedbAITheme();
	const insets = useSafeAreaInsets();
	// Read live rather than at module scope, so a rotation resizes the sheet instead
	// of leaving it the height of the orientation the app happened to start in.
	const { height } = useWindowDimensions();
	const sheetHeight = height * heightRatio;

	const [composerOpen, setComposerOpen] = useState(false);
	useEffect(() => {
		if (!visible) setComposerOpen(false);
	}, [visible]);

	const slide = progress.interpolate({
		inputRange: [0, 1],
		outputRange: [sheetHeight, 0],
	});

	// Naming the real cadence is what makes a vote worth casting, so it is derived
	// from the same `rankCycleMs` the ranking uses and can never contradict it.
	const cadence = subtitle ? undefined : cadenceLabel(RANK_CYCLE_MS);

	return (
		<View style={styles.sheetRoot}>
			<Animated.View style={[styles.scrim, { opacity: progress }]}>
				<Pressable style={styles.scrim} onPress={onClose} />
			</Animated.View>

			<Animated.View
				style={[
					styles.sheet,
					style,
					{ height: sheetHeight, transform: [{ translateY: slide }] },
				]}
			>
				<View style={styles.sheetHeader}>
					<View style={styles.grabber} />
					<Pressable
						accessibilityRole="button"
						accessibilityLabel="Close the idea board"
						hitSlop={12}
						onPress={onClose}
						style={({ pressed }) => [
							styles.sheetDismiss,
							pressed && styles.pressed,
						]}
					>
						<Text style={styles.sheetDismissLabel}>{closeLabel}</Text>
					</Pressable>
				</View>

				{/* The board names itself, says what to do with it, and says what happens
				    afterwards — a vote is worth casting only if it leads somewhere. */}
				<View style={styles.sheetTitleBlock}>
					<Text style={styles.sheetTitle}>{title}</Text>
					<Text style={styles.sheetSubtitle}>
						{subtitle ??
							`Vote for what you want next. Our AI engineer builds the most-wanted ideas ${cadence}.`}
					</Text>
				</View>

				{/* Padding at the end of the list clears the floating button. */}
				<FeedbAIList
					contentStyle={{ paddingBottom: insets.bottom + 96 }}
					emptyLabel={emptyLabel}
					onVote={onVote}
					onItemPress={onItemPress}
					itemStyle={itemStyle}
				/>

				<View
					style={[styles.dock, { paddingBottom: insets.bottom + 16 }]}
					pointerEvents="box-none"
				>
					<Pressable
						accessibilityRole="button"
						onPress={() => setComposerOpen(true)}
						style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
					>
						<ComposeIcon size={22} color={theme.onPrimaryColor} />
						<Text style={styles.pillLabel}>{composeLabel}</Text>
					</Pressable>
				</View>
			</Animated.View>

			{/* Writing stacks over the board rather than replacing it. */}
			<FeedbAIComposerSheet
				{...composerProps}
				visible={composerOpen}
				onClose={() => setComposerOpen(false)}
				onSubmit={onSubmit ?? composerProps?.onSubmit}
			/>
		</View>
	);
}
