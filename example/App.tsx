import { FeedbAIList } from 'expo-feedback-ai';
import { View } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <FeedbAIList onTap={() => console.log('Tapped!')} style={{
        height: 200,
        width: 200,
        backgroundColor: 'lightblue',
      }} />
    </View>
  );
}
