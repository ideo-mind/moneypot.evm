export const COLORS = [
  { name: "Red", class: "bg-red-500" },
  { name: "Green", class: "bg-green-500" },
  { name: "Blue", class: "bg-blue-500" },
  { name: "Yellow", class: "bg-yellow-500" },
];
export const ALL_DIRECTIONS = ["Up", "Down", "Left", "Right", "Skip"];
export const MAPPABLE_DIRECTIONS = ["Up", "Down", "Left", "Right"];

// Network configurations
export const NETWORKS = {
  CREDITCOIN: {
    name: 'Creditcoin Testnet',
    chainId: '102031',
    symbol: 'CTC',
    type: 'evm' as const,
  },
};

// Wallet types
export type WalletType = 'evm';
const uniqueChars = (arr: string[]) => [...new Set(arr)];
export const CHARACTER_DOMAINS: Record<string, string[]> = {
  ascii: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
  symbols: uniqueChars("!@#$%^&*()_+-=[]{}|;:,.<>?~`".split("")),
  arrows: uniqueChars("←↑→↓↔↕↖↗↘↙⇦⇧⇨⇩⇿⇽⇾⇿���➘➙➚➛➜➝➞➟➠➡➢➣➤➥➦➧➨➩➪➫➬➭➮➯⟵⟶⟷".split("")),
  math: uniqueChars("∑∫∏√��∞≈≠≤≥÷×ƒ∂∆∇∈∉∩∪⊂⊃⊆⊇∀∃∄∅∧∨¬".split("")),
  greek: uniqueChars("ΑΒΓΔΕΖΗ��ΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω".split("")),
  emojis: uniqueChars("😀😂😍🤔🔥👍❤️💯🎉🚀🌟⭐✨💀👽🤖👾🎃😺🙈🌍��✔️❌".split("")),
  geometric: uniqueChars("■□▪▫▬▲►▼◄◊○●◘◙◦◧◨◩◪◫◬◭◮◸◹◺◻◼◽◾".split("")),
  box: uniqueChars("─│┌┐└┘├┤┬┴┼═║��╗╚╝╠╣╦╩╬".split("")),
  braille: uniqueChars("⠁⠂⠃⠄⠅⠆⠇⡀⡁⡂⡃⡄⡅⡆⡇⢀⢁⢂⢃⢄⢅⢆⢇⣀⣁⣂⣃⣄⣅⣆⣇".split("")),
  runic: uniqueChars("ᚠᚢᚦᚨᚱ���ᚷᚹᚺᚻᚾᛁᛃᛄᛇᛈᛉᛊᛏᛒᛖᛗᛘᛚᛛᛜᛝᛞᛟ".split("")),
  currency: uniqueChars("$€£¥��₽₩฿₿".split("")),
  misc: uniqueChars("©®™℠℡℗℀℁℅℆№ªº⚀⚁⚂⚃⚄⚅♠♡♢♣♤♥♦♧".split("")),
  animals: uniqueChars("🐶🐱🐭🐹🐰🦊🐻🐼🐨🐯🦁🐮🐷🐸🐵🐔🐧🐦🐤🦆🦅🦉🦇🐺🐗🐴🦄🐝🐛🦋🐌🐞🐜🕷️🦂🦀🐍🐢🐠🐟🐡🐬🦈🐳🐋🐊🐆🐅🐃🐂🐄".split("")),
  food: uniqueChars("🍎🍏🍐🍊🍋🍌🍉🍇🍓🍈🍒🍑🍍🥥🥝🍅🍆🥑🥦🥬🥒🌶️🌽🥕🍞🥐🥖🥨🧀🥚🍳🥞🥓🥩🍗🍖🌭🍔🍟🍕🥪🥙🌮🌯🥗".split("")),
  sports: uniqueChars("��🏀🏈⚾🥎🎾🏐🏉🥏🎱🏓🏸🏒🏑🏏🥅⛳���🎣🥊🥋🎽🛹🛷⛸️🥌🎿⛷️🏂🏋️‍♀️🤺🤼‍♀️🤸‍♀️⛹️‍♀️".split("")),
  travel: uniqueChars("🚗🚕🚙🚌���🏎️🚓🚑🚒🚐🚚🚛🚜🛴🚲🛵🏍️🚨��🚍🚘🚖✈️🛫🛬🛩️🚁🛰️🚀🛸⛵🛥️🚤⛴️🛳️".split("")),
  japanese: uniqueChars("あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん".split("")),
  korean: uniqueChars("ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎㅏㅑㅓㅕㅗㅛㅜㅠㅡㅣ".split("")),
  chinese: uniqueChars("的一是不了人我在有他这之大来以个中上��".split("")),
  arabic: uniqueChars("ابتثجحخدذرزسشصضطظعغفقكلمنهوي".split("")),
  cyrillic: uniqueChars("абвгдеёжзийклмнопрстуфхцчшщъыьэюя".split("")),
};
