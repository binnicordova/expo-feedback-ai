import { FeedbAISheet, useFeedbacks } from 'expo-feedback-ai';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

// The module is not configured anywhere in this app — it starts itself the first time
// the board is rendered and runs against its bundled demo feed. `FeedbAISheet` is the
// whole thing — heading, ranked list, composer — so the app owns nothing but the
// button that opens it, and the board follows the system into dark mode on its own.
export default function App() {
  return (
    <SafeAreaProvider>
      <Home />
    </SafeAreaProvider>
  );
}

function Home() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const feedbacks = useFeedbacks();
  const dark = useColorScheme() === 'dark';

  return (
    <SafeAreaView
      style={[styles.screen, dark && styles.screenDark]}
      edges={['top', 'bottom']}
    >
      <View style={styles.body}>
        <Text style={[styles.heading, dark && styles.headingDark]}>Your app</Text>
        <Text style={styles.subheading}>
          {feedbacks.length} idea{feedbacks.length === 1 ? '' : 's'} on the board
        </Text>
      </View>

      <Pressable style={styles.cta} onPress={() => setSheetOpen(true)}>
        <Text style={styles.ctaLabel}>Share an idea</Text>
      </Pressable>

      <FeedbAISheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onVote={(item, liked) => console.log('vote', item.uid, liked)}
        onItemPress={(item) => console.log('open', item.uid)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  screenDark: { backgroundColor: '#0b0b0e' },
  body: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  heading: { fontSize: 24, fontWeight: '700', color: '#000' },
  headingDark: { color: '#fff' },
  subheading: { fontSize: 14, color: '#6b6b70' },
  cta: {
    margin: 20,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#6200ee',
  },
  ctaLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
