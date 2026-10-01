import { Book, Chapter, FlashCard } from './types';
import { createInitialFsrsState } from '../study/fsrs';
import { generateFingerprint } from '../study/dedupe';

export const SAMPLE_BOOKS: { book: Book; chapters: Chapter[]; cards: FlashCard[] }[] = [
  {
    book: {
      id: 'book_sample_art_of_war',
      title: 'The Art of War',
      author: 'Sun Tzu',
      pageCount: 42,
      chapterCount: 5,
      fileHash: 'hash_sample_art_of_war',
      addedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
      lastOpenedAt: Date.now() - 15 * 60 * 1000,
      status: 'ready',
      progress: {
        chapterId: 'chap_art_of_war_1',
        chapterIndex: 0,
        page: 4,
        percent: 20,
      },
    },
    chapters: [
      {
        id: 'chap_art_of_war_1',
        bookId: 'book_sample_art_of_war',
        index: 0,
        title: 'Chapter I: Laying Plans',
        startPage: 1,
        endPage: 8,
        tokenEstimate: 950,
        textHash: 'hash_chap_1_plans',
        text: `1. Sun Tzu said: The art of war is of vital importance to the State.
2. It is a matter of life and death, a road either to safety or to ruin. Hence it is a subject of inquiry which can on no account be neglected.
3. The art of war, then, is governed by five constant factors, to be taken into account in one's deliberations, when seeking to determine the conditions obtaining in the field.
4. These are: (1) The Moral Law; (2) Heaven; (3) Earth; (4) The Commander; (5) Method and discipline.
5. The Moral Law causes the people to be in complete accord with their ruler, so that they will follow him regardless of their lives, undismayed by any danger.
6. Heaven signifies night and day, cold and heat, times and the seasons.
7. Earth comprises distances, great and small; danger and security; open ground and narrow passes; the chances of life and death.
8. The Commander stands for the virtues of wisdom, sincerely, benevolence, courage and strictness.
9. By method and discipline are to be understood the marshaling of the army in its proper subdivisions, the graduations of rank among the officers, the maintenance of roads by which supplies may reach the army, and the control of military expenditure.
10. These five heads should be familiar to every general: he who knows them will be victorious; he who knows them not will fail.
11. Therefore, in your deliberations, when seeking to determine the military conditions, let them be made the basis of a comparison, in this wise:
(1) Which of the two sovereigns is imbued with the Moral law?
(2) Which of the two generals has most ability?
(3) With whom lie the advantages derived from Heaven and Earth?
(4) On which side is discipline most rigorously enforced?
(5) Which army is stronger?
(6) On which side are officers and men more highly trained?
(7) In which army is there the greater constancy both in reward and punishment?
12. By means of these seven considerations I can forecast victory or defeat.
13. All warfare is based on deception.
14. Hence, when able to attack, we must seem unable; when using our forces, we must seem inactive; when we are near, we must make the enemy believe we are far away; when far away, we must make him believe we are near.
15. Hold out baits to entice the enemy. Feign disorder, and crush him.
16. If he is secure at all points, be prepared for him. If he is in superior strength, evade him.
17. If your opponent is of choleric temper, seek to irritate him. Pretend to be weak, that he may grow arrogant.
18. If he is taking his ease, give him no rest. If his forces are united, separate them.
19. Attack him where he is unprepared, appear where you are not expected.
20. These military devices, leading to victory, must not be divulged beforehand.`,
      },
      {
        id: 'chap_art_of_war_2',
        bookId: 'book_sample_art_of_war',
        index: 1,
        title: 'Chapter II: Waging War',
        startPage: 9,
        endPage: 16,
        tokenEstimate: 850,
        textHash: 'hash_chap_2_waging',
        text: `1. Sun Tzu said: In the operations of war, where there are in the field a thousand swift chariots, as many heavy chariots, and a hundred thousand mail-clad soldiers, with provisions enough to carry them a thousand li, the expenditure at home and at the front, including entertainment of guests, small items such as glue and paint, and sums spent on chariots and armor, will reach the total of a thousand ounces of silver per day. Such is the cost of raising an army of 100,000 men.
2. When you engage in actual fighting, if victory is long in coming, then men's weapons will grow dull and their ardor will be damped. If you lay siege to a town, you will exhaust your strength.
3. Again, if the campaign is protracted, the resources of the State will not be equal to the strain.
4. Now, when your weapons are dulled, your ardor damped, your strength exhausted and your treasure spent, other chieftains will spring up to take advantage of your extremity. Then no man, however wise, will be able to avert the consequences that must ensue.
5. Thus, though we have heard of stupid haste in war, cleverness has never been seen associated with long delays.
6. There is no instance of a country having benefited from prolonged warfare.
7. It is only one who is thoroughly acquainted with the evils of war that can thoroughly understand the profitable way of conducting it.
8. The skillful soldier does not raise a second levy, neither are his supply-wagons loaded more than twice.
9. Bring war material with you from home, but forage on the enemy. Thus the army will have food enough for its needs.
10. Poverty of the State exchequer causes an army to be maintained by contributions from a distance. Contributing to maintain an army at a distance causes the people to be impoverished.`,
      },
      {
        id: 'chap_art_of_war_3',
        bookId: 'book_sample_art_of_war',
        index: 2,
        title: 'Chapter III: Attack by Stratagem',
        startPage: 17,
        endPage: 24,
        tokenEstimate: 800,
        textHash: 'hash_chap_3_stratagem',
        text: `1. Sun Tzu said: In the practical art of war, the best thing of all is to take the enemy's country whole and intact; to shatter and destroy it is not so good. So, too, it is better to recapture an army entire than to destroy it.
2. Hence to fight and conquer in all your battles is not supreme excellence; supreme excellence consists in breaking the enemy's resistance without fighting.
3. Thus the highest form of generalship is to balk the enemy's plans; the next best is to prevent the junction of the enemy's forces; the next in order is to attack the enemy's army in the field; and the worst policy of all is to besiege walled cities.
4. The rule is, not to besiege walled cities if it can possibly be avoided.
5. Therefore the skillful leader subdues the enemy's troops without any fighting; he captures their cities without laying siege to them; he overthrows their kingdom without lengthy operations in the field.
6. With his forces intact he will dispute the mastery of the Empire, and thus, without losing a man, his triumph will be complete. This is the method of attacking by stratagem.
7. It is the rule in war, if our forces are ten to the enemy's one, to surround him; if five to one, to attack him; if twice as numerous, to divide our army into two.
8. If equally matched, we can offer battle; if slightly inferior in numbers, we can avoid the enemy; if quite unequal in every way, we can flee from him.
9. Hence, though an obstinate fight may be made by a small force, in the end it must be captured by the larger force.
10. He will win who knows when to fight and when not to fight.
11. He will win who knows how to handle both superior and inferior forces.
12. He will win whose army is animated by the same spirit throughout all its ranks.
13. He will win who, prepared himself, waits to take the enemy unprepared.
14. Hence the saying: If you know the enemy and know yourself, you need not fear the result of a hundred battles. If you know yourself but not the enemy, for every victory gained you will also suffer a defeat. If you know neither the enemy nor yourself, you will succumb in every battle.`,
      },
      {
        id: 'chap_art_of_war_4',
        bookId: 'book_sample_art_of_war',
        index: 3,
        title: 'Chapter IV: Tactical Dispositions',
        startPage: 25,
        endPage: 32,
        tokenEstimate: 750,
        textHash: 'hash_chap_4_dispositions',
        text: `1. Sun Tzu said: The good fighters of old first put themselves beyond the possibility of defeat, and then waited for an opportunity of defeating the enemy.
2. To secure ourselves against defeat lies in our own hands, but the opportunity of defeating the enemy is provided by the enemy himself.
3. Thus the good fighter is able to secure himself against defeat, but cannot make certain of defeating the enemy.
4. Hence the saying: One may know how to conquer without being able to do it.
5. Security against defeat implies defensive tactics; ability to defeat the enemy means taking the offensive.
6. Standing on the defensive indicates insufficient strength; attacking, a superabundance of strength.
7. The general who is skilled in defense hides in the most secret recesses of the earth; he who is skilled in attack flashes forth from the topmost heights of heaven. Thus on the one hand we have ability to protect ourselves; on the other, a victory that is complete.`,
      },
      {
        id: 'chap_art_of_war_5',
        bookId: 'book_sample_art_of_war',
        index: 4,
        title: 'Chapter V: Energy & Timing',
        startPage: 33,
        endPage: 42,
        tokenEstimate: 700,
        textHash: 'hash_chap_5_energy',
        text: `1. Sun Tzu said: The control of a large force is the same principle as the control of a few men: it is merely a question of dividing up their numbers.
2. Fighting with a large army under your command is nowise different from fighting with a small one: it is merely a question of instituting signs and signals.
3. To ensure that your whole host may withstand the brunt of the enemy's attack and remain unshaken—this is effected by maneuvers, direct and indirect.
4. That the impact of your army may be like a grindstone dashed against an egg—this is effected by the science of weak points and strong.
5. In all fighting, the direct method may be used for joining battle, but indirect methods will be needed in order to secure victory.
6. Energy may be likened to the bending of a crossbow; decision, to the releasing of a trigger.`,
      },
    ],
    cards: [
      {
        id: 'card_aow_1',
        bookId: 'book_sample_art_of_war',
        chapterId: 'chap_art_of_war_1',
        chapterTitle: 'Chapter I: Laying Plans',
        type: 'basic',
        front: 'What are the five constant factors that govern the art of war according to Sun Tzu?',
        back: '1. The Moral Law\n2. Heaven (climate/seasons)\n3. Earth (terrain/distances)\n4. The Commander (wisdom, benevolence, courage, strictness)\n5. Method and Discipline (organization/logistics)',
        hint: 'Think of morals, environment, leadership, and organization',
        conceptKey: 'five-constant-factors',
        fingerprint: generateFingerprint('What are the five constant factors that govern the art of war according to Sun Tzu?'),
        sourcePage: 2,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'card_aow_2',
        bookId: 'book_sample_art_of_war',
        chapterId: 'chap_art_of_war_1',
        chapterTitle: 'Chapter I: Laying Plans',
        type: 'concept',
        front: 'What is the fundamental premise underlying all warfare in Sun Tzu’s philosophy?',
        back: 'All warfare is based on deception.\n\nWhen able to attack, seem unable; when using forces, seem inactive; when near, make the enemy believe you are far away.',
        hint: 'Deception and perception',
        conceptKey: 'warfare-deception-principle',
        fingerprint: generateFingerprint('What is the fundamental premise underlying all warfare in Sun Tzu’s philosophy?'),
        sourcePage: 3,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'card_aow_3',
        bookId: 'book_sample_art_of_war',
        chapterId: 'chap_art_of_war_3',
        chapterTitle: 'Chapter III: Attack by Stratagem',
        type: 'basic',
        front: 'What represents "supreme excellence" in warfare according to Chapter 3?',
        back: 'Supreme excellence consists in breaking the enemy’s resistance without fighting.\n\nSubduing the enemy without battle preserves the State and resources whole and intact.',
        hint: 'Victory without bloodshed',
        conceptKey: 'supreme-excellence-stratagem',
        fingerprint: generateFingerprint('What represents supreme excellence in warfare according to Chapter 3?'),
        sourcePage: 17,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'card_aow_4',
        bookId: 'book_sample_art_of_war',
        chapterId: 'chap_art_of_war_3',
        chapterTitle: 'Chapter III: Attack by Stratagem',
        type: 'cloze',
        front: 'Complete Sun Tzu’s famous dictum: "If you know the enemy and know yourself, you need not fear..."',
        back: '"...the result of a hundred battles."\n\nIf you know yourself but not the enemy, you will suffer a defeat for every victory. If you know neither, you will succumb in every battle.',
        hint: 'Hundred battles',
        conceptKey: 'know-enemy-know-yourself',
        fingerprint: generateFingerprint('Complete Sun Tzus famous dictum If you know the enemy and know yourself you need not fear'),
        sourcePage: 24,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
      {
        id: 'card_aow_5',
        bookId: 'book_sample_art_of_war',
        chapterId: 'chap_art_of_war_2',
        chapterTitle: 'Chapter II: Waging War',
        type: 'concept',
        front: 'Why does Sun Tzu strictly argue against prolonged warfare?',
        back: 'There is no instance of a country having benefited from prolonged warfare.\n\nLong campaigns dull weapons, dampen morale, exhaust state treasuries, and invite rival powers to attack when you are depleted.',
        hint: 'Exhaustion of treasure and morale',
        conceptKey: 'prolonged-warfare-perils',
        fingerprint: generateFingerprint('Why does Sun Tzu strictly argue against prolonged warfare?'),
        sourcePage: 10,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
      },
    ],
  },
  {
    book: {
      id: 'book_sample_meditations',
      title: 'Meditations',
      author: 'Marcus Aurelius',
      pageCount: 36,
      chapterCount: 3,
      fileHash: 'hash_sample_meditations',
      addedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
      lastOpenedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      status: 'ready',
      progress: {
        chapterId: 'chap_med_1',
        chapterIndex: 0,
        page: 2,
        percent: 10,
      },
    },
    chapters: [
      {
        id: 'chap_med_1',
        bookId: 'book_sample_meditations',
        index: 0,
        title: 'Book II: On the River of Time & Daily Attitude',
        startPage: 1,
        endPage: 12,
        tokenEstimate: 700,
        textHash: 'hash_chap_med_1',
        text: `1. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot tell good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine.
2. And so none of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my relative, or hate him. We were made to work together like feet, like hands, like the rows of the upper and lower teeth.
3. Whatever this is that I am, it is a little flesh and breath, and the ruling part. Despise the flesh: blood and bones and a network, a jumble of nerves, veins, and arteries. Consider the breath: wind, always changing, expelled and sucked back in again. The third part is the ruling master.
4. Put away your books; no more distraction; it is not allowed. Rather, as if you were already dying, despise the flesh: it is merely dirty blood, bones, a net woven of cords, veins, arteries.
5. Remember how long you have been putting this off, how many times you have been given a period of grace by the gods and not used it. It is high time you realized you have a limit set to your time, and if you do not use it to emancipate yourself, it will be gone and never come again.`,
      },
      {
        id: 'chap_med_2',
        bookId: 'book_sample_meditations',
        index: 1,
        title: 'Book IV: The Inner Citadel & Mind’s Tranquility',
        startPage: 13,
        endPage: 24,
        tokenEstimate: 750,
        textHash: 'hash_chap_med_2',
        text: `3. Men seek retreats for themselves, houses in the country, sea-shores, and mountains; and you too are wont to desire such things very much. But this is altogether a mark of the most common sort of men, for it is in your power whenever you will to retire into yourself.
For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul, particularly when he has within him such thoughts that by looking into them he is immediately in perfect tranquility; and I affirm that tranquility is nothing else than the good ordering of the mind.
Constantly then give to yourself this retreat, and renew yourself; and let your rules be few and fundamental.
4. Remember that things do not touch the soul, for they are external and remain immovable; but our perturbations come only from the opinion which is within.
Again, that the universe is fluid, change; and that our life is what our thoughts make it.`,
      },
    ],
    cards: [
      {
        id: 'card_med_1',
        bookId: 'book_sample_meditations',
        chapterId: 'chap_med_1',
        chapterTitle: 'Book II: On the River of Time & Daily Attitude',
        type: 'concept',
        front: 'How did Marcus Aurelius advise preparing oneself mentally each morning?',
        back: 'Remind yourself that you will encounter difficult, ungrateful, or deceitful people, but recognize they act out of ignorance of good and evil. Since you understand virtue, their behavior cannot harm your character, and you should cooperate rather than resent them.',
        hint: 'Morning reflection on human nature',
        conceptKey: 'morning-stoic-preparation',
        fingerprint: generateFingerprint('How did Marcus Aurelius advise preparing oneself mentally each morning?'),
        sourcePage: 1,
        fsrs: createInitialFsrsState(),
        createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
      },
    ],
  },
];

export async function seedSampleBooksIfEmpty(db: any): Promise<void> {
  const count = await db.books.count();
  if (count === 0) {
    for (const sample of SAMPLE_BOOKS) {
      await db.books.put(sample.book);
      await db.chapters.bulkPut(sample.chapters);
      if (sample.cards.length > 0) {
        await db.cards.bulkPut(sample.cards);
      }
    }
  }
}
