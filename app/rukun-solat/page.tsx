'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { RukunBadge } from '@/components/RukunBadge';

type RukunType = "fi'li" | 'qauli' | 'qalbi';

type Rukun = {
  name: string;
  type: RukunType;
};

const RUKUN_SOLAT: Rukun[] = [
  { name: 'Berdiri tegak sekiranya mampu ketika solat fardu', type: "fi'li" },
  { name: 'Niat', type: 'qalbi' },
  { name: 'Takbiratul Ihram', type: 'qauli' },
  { name: 'Membaca Surah Al-Fatihah pada setiap rakaat', type: 'qauli' },
  { name: 'Rukuk dengan tamakninah', type: "fi'li" },
  { name: 'Iktidal dengan tamakninah', type: "fi'li" },
  { name: 'Sujud dua kali pada setiap rakaat dengan tamakninah', type: "fi'li" },
  { name: 'Duduk antara dua sujud dengan tamakninah', type: "fi'li" },
  { name: 'Duduk tasyahud akhir dengan tamakninah', type: "fi'li" },
  { name: 'Membaca tasyahud akhir', type: 'qauli' },
  { name: 'Membaca selawat ke atas Nabi pada tasyahud akhir', type: 'qauli' },
  { name: 'Membaca salam yang pertama', type: 'qauli' },
  { name: 'Tertib (mengikut turutan)', type: "fi'li" },
];

export default function RukunSolatPage() {
  const [quizMode, setQuizMode] = useState(false);
  const [items, setItems] = useState<Rukun[]>(RUKUN_SOLAT);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    setResult(null);
    if (quizMode) {
      setItems(shuffle([...RUKUN_SOLAT]));
    } else {
      setItems(RUKUN_SOLAT);
    }
  }, [quizMode]);

  const onSubmit = () => {
    let score = 0;
    items.forEach((item, index) => {
      if (item === RUKUN_SOLAT[index]) score++;
    });
    setResult(score);
    toast.success('Jawapan disemak');
  };

  return (
    <div className="min-h-screen p-4 max-w-xl mx-auto space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Rukun Solat</h1>
        <p className="text-sm text-muted-foreground">
          Rukun solat ada 13 perkara semuanya. Tamakninah ialah berhenti seketika dalam solat sekadar tempoh menyebut subhanallah.
        </p>
      </header>

      {quizMode && (
        <div className="rounded-lg border border-dashed p-4 bg-muted/40 text-sm space-y-1">
          <p className="font-medium">🎯 Objektif Quiz</p>
          <p className="text-muted-foreground">
            Seret dan susun rukun solat mengikut <strong>turutan yang betul</strong> dari atas ke bawah.
          </p>
        </div>
      )}

      <DndContext
        collisionDetection={closestCenter}
        onDragEnd={(event) => {
          const { active, over } = event;
          if (over && active.id !== over.id) {
            setItems((items) => {
              const oldIndex = items.findIndex(i => i.name === active.id);
              const newIndex = items.findIndex(i => i.name === over.id);
              return arrayMove(items, oldIndex, newIndex);
            });
          }
        }}
      >
        <SortableContext items={items.map(i => i.name)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {items.map((item, index) => (
              <SortableItem
                key={item.name}
                item={item}
                index={index}
                quizMode={quizMode}
                correct={result !== null && item === RUKUN_SOLAT[index]}
                wrong={result !== null && item !== RUKUN_SOLAT[index]}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!quizMode && (
        <Button className="w-full" onClick={() => setQuizMode(true)}>
          🧠 Cuba Quiz Mode
        </Button>
      )}

      {quizMode && (
        <div className="space-y-2">
          {result === null ? (
            <Button className="w-full" onClick={onSubmit}>
              Hantar Jawapan
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-2 text-center">
                <p className="font-semibold">Markah Anda</p>
                <p className="text-2xl font-bold">
                  {result} / {RUKUN_SOLAT.length}
                </p>
                <Button variant="outline" onClick={() => setQuizMode(false)}>
                  Kembali
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function SortableItem({
  item,
  index,
  quizMode,
  correct,
  wrong,
}: {
  item: { name: string, type: RukunType };
  index: number;
  quizMode: boolean;
  correct?: boolean;
  wrong?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`flex flex-row items-center gap-3 p-4 ${correct ? 'border-green-500' : ''
        } ${wrong ? 'border-red-500' : ''}`}
    >
      <span className="text-sm font-bold w-6">{index + 1}</span>
      <span className="flex-1">{item.name}</span>
      <RukunBadge type={item.type} />
      {quizMode && (
        <GripVertical
          className="cursor-grab text-muted-foreground"
          {...attributes}
          {...listeners}
        />
      )}
    </Card>
  );
}

function shuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
