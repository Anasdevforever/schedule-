import React, { useState, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Image,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { GestureHandlerRootView, PinchGestureHandler, State } from 'react-native-gesture-handler';

const APP_BG = '#F5F0E8';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#3D3929';
const TEXT_LIGHT = '#8A8372';
const ACCENT = '#C96442';
const BORDER = '#E8E0D4';
const LOGO_COLOR = '#8B6F52';

const CATEGORY_COLORS = [
  '#E07A5F', '#81B29A', '#F2CC8F', '#3D5A80',
  '#9381FF', '#F4978E', '#6D9DC5', '#B5838D',
  '#52796F', '#E9C46A',
];

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const DRAWER_WIDTH = Dimensions.get('window').width * 0.8;
const SCREEN_WIDTH = Dimensions.get('window').width;

const STORAGE_KEY_V2 = 'sanfoor_data_v2';
const STORAGE_KEY_V1 = 'schedule_app_data_v1';
const MAX_RECENT = 20;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function nextDateForDay(startDate, dayIndex) {
  if (!startDate) return '';
  const start = new Date(startDate);
  if (isNaN(start)) return '';
  const base = new Date();
  const ref = base > start ? base : start;
  const diff = (dayIndex - ref.getDay() + 7) % 7;
  const result = new Date(ref);
  result.setDate(ref.getDate() + diff);
  return result.toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' });
}

function lightenColor(hex, amount = 0.82) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const bg = { r: 245, g: 240, b: 232 };
  const nr = Math.round(r * (1 - amount) + bg.r * amount);
  const ng = Math.round(g * (1 - amount) + bg.g * amount);
  const nb = Math.round(b * (1 - amount) + bg.b * amount);
  return `rgb(${nr},${ng},${nb})`;
}

export default function App() {
  const [schedules, setSchedules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [notes, setNotes] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [recentItems, setRecentItems] = useState([]);

  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [activeNoteId, setActiveNoteId] = useState(null);

  const [screen, setScreen] = useState('home');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const fadeAnim = useState(new Animated.Value(1))[0];

  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageSubjects, setShowManageSubjects] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);

  const hasLoadedOnce = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const rawV2 = await AsyncStorage.getItem(STORAGE_KEY_V2);
        if (rawV2) {
          const p = JSON.parse(rawV2);
          if (p.schedules) setSchedules(p.schedules);
          if (p.categories) setCategories(p.categories);
          if (p.notes) setNotes(p.notes);
          if (p.photos) setPhotos(p.photos);
          if (p.recentItems) setRecentItems(p.recentItems);
        } else {
          const rawV1 = await AsyncStorage.getItem(STORAGE_KEY_V1);
          if (rawV1) {
            const p1 = JSON.parse(rawV1);
            if (p1.schedules) setSchedules(p1.schedules);
            if (p1.categories) setCategories(p1.categories);
          }
        }
      } catch (e) {
      } finally {
        hasLoadedOnce.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!hasLoadedOnce.current) return;
    AsyncStorage.setItem(
      STORAGE_KEY_V2,
      JSON.stringify({ schedules, categories, notes, photos, recentItems })
    ).catch(() => {});
  }, [schedules, categories, notes, photos, recentItems]);

  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 230, useNativeDriver: true }).start();
  }, [screen, activeScheduleId, activeNoteId]);

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  }
  function closeDrawer() {
    Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: false }).start(() =>
      setDrawerOpen(false)
    );
  }

  function pushRecent(type, refId, label) {
    setRecentItems((prev) => {
      const filtered = prev.filter((r) => !(r.type === type && r.refId === refId));
      const next = [{ id: uid(), type, refId, label, ts: Date.now() }, ...filtered];
      return next.slice(0, MAX_RECENT);
    });
  }

  function goHome() {
    setScreen('home');
  }

  function addCategory(name, color) {
    setCategories((prev) => [...prev, { id: uid(), name, color }]);
  }

  function saveSchedule(schedule) {
    setSchedules((prev) => {
      const exists = prev.find((s) => s.id === schedule.id);
      if (exists) return prev.map((s) => (s.id === schedule.id ? schedule : s));
      return [...prev, schedule];
    });
    pushRecent('schedule', schedule.id, schedule.name);
    setActiveScheduleId(schedule.id);
    setShowAddSchedule(false);
    setScreen('scheduleView');
  }

  function updateScheduleMeta(id, name, startDate, endDate) {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, name, startDate, endDate } : s)));
    pushRecent('schedule', id, name);
    setEditingSchedule(null);
  }

  function deleteSchedule(id) {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    setRecentItems((prev) => prev.filter((r) => !(r.type === 'schedule' && r.refId === id)));
    setEditingSchedule(null);
    if (activeScheduleId === id) {
      setActiveScheduleId(null);
      setScreen('scheduleList');
    }
  }

  function updateScheduleSubjects(id, subjects) {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, subjects } : s)));
  }

  function addNote(title) {
    const note = { id: uid(), title, blocks: [{ id: uid(), type: 'text', text: '' }], updatedAt: Date.now() };
    setNotes((prev) => [...prev, note]);
    pushRecent('note', note.id, title);
    setActiveNoteId(note.id);
    setShowAddNote(false);
    setScreen('noteEditor');
  }

  function updateNoteBlocks(id, blocks) {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, blocks, updatedAt: Date.now() } : n)));
  }

  function deleteNote(id) {
    Alert.alert('حذف المحاضرة', 'هل أنت متأكد من حذفها؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف',
        style: 'destructive',
        onPress: () => {
          setNotes((prev) => prev.filter((n) => n.id !== id));
          setRecentItems((prev) => prev.filter((r) => !(r.type === 'note' && r.refId === id)));
          if (activeNoteId === id) {
            setActiveNoteId(null);
            setScreen('notesList');
          }
        },
      },
    ]);
  }

  async function addPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('يحتاج صلاحية', 'يرجى السماح بالوصول للصور من إعدادات الهاتف.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newPhotos = result.assets.map((a) => ({ id: uid(), uri: a.uri }));
      setPhotos((prev) => [...prev, ...newPhotos]);
    }
  }

  function deletePhoto(id) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId);
  const activeNote = notes.find((n) => n.id === activeNoteId);

  function headerTitleFor() {
    if (screen === 'home') return '';
    if (screen === 'scheduleList') return 'الجدول';
    if (screen === 'scheduleView') return activeSchedule ? activeSchedule.name : 'الجدول';
    if (screen === 'notesList') return 'النوتس';
    if (screen === 'noteEditor') return activeNote ? activeNote.title : 'محاضرة';
    if (screen === 'photosGrid') return 'الصور';
    return '';
  }

  function handleBack() {
    if (screen === 'scheduleView') {
      setActiveScheduleId(null);
      setScreen('scheduleList');
    } else if (screen === 'noteEditor') {
      setActiveNoteId(null);
      setScreen('notesList');
    } else {
      setScreen('home');
    }
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>≡</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          {screen !== 'home' && (
            <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.headerTitle} numberOfLines={1}>
            {headerTitleFor()}
          </Text>
        </View>

        {screen === 'scheduleView' && activeSchedule ? (
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowManageSubjects(true)}>
            <Text style={styles.editHeaderIcon}>✎</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {screen === 'home' && (
          <HomeScreen onOpen={(s) => setScreen(s)} />
        )}

        {screen === 'scheduleList' && (
          <ScheduleListScreen
            schedules={schedules}
            activeScheduleId={activeScheduleId}
            onSelect={(id) => {
              setActiveScheduleId(id);
              setScreen('scheduleView');
            }}
            onEdit={(s) => setEditingSchedule(s)}
            onAddSchedule={() => setShowAddSchedule(true)}
            onAddCategory={() => setShowAddCategory(true)}
          />
        )}

        {screen === 'scheduleView' && activeSchedule && (
          <ScheduleView schedule={activeSchedule} categories={categories} />
        )}

        {screen === 'notesList' && (
          <NotesListScreen
            notes={notes}
            onSelect={(id) => {
              setActiveNoteId(id);
              setScreen('noteEditor');
            }}
            onAdd={() => setShowAddNote(true)}
            onDelete={deleteNote}
          />
        )}

        {screen === 'noteEditor' && activeNote && (
          <NoteEditorScreen note={activeNote} onChangeBlocks={(blocks) => updateNoteBlocks(activeNote.id, blocks)} />
        )}

        {screen === 'photosGrid' && (
          <PhotosGridScreen photos={photos} onAdd={addPhotos} onDelete={deletePhoto} />
        )}
      </Animated.View>

      {drawerOpen && <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeDrawer} />}
      <Animated.View style={[styles.drawer, { left: drawerAnim }]}>
        <Text style={styles.drawerTitle}>الأحدث</Text>
        <ScrollView style={{ marginTop: 6 }}>
          {recentItems.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={styles.recentRow}
              onPress={() => {
                if (r.type === 'schedule') {
                  if (schedules.find((s) => s.id === r.refId)) {
                    setActiveScheduleId(r.refId);
                    setScreen('scheduleView');
                  }
                } else if (r.type === 'note') {
                  if (notes.find((n) => n.id === r.refId)) {
                    setActiveNoteId(r.refId);
                    setScreen('noteEditor');
                  }
                }
                closeDrawer();
              }}
            >
              <Text style={styles.recentIcon}>{r.type === 'schedule' ? '📅' : '📝'}</Text>
              <Text style={styles.recentText} numberOfLines={1}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
          {recentItems.length === 0 && <Text style={styles.noSchedules}>لا يوجد عناصر بعد</Text>}
        </ScrollView>
      </Animated.View>

      <Modal visible={showAddSchedule} animationType="slide">
        <AddScheduleScreen
          categories={categories}
          onAddCategory={addCategory}
          onCancel={() => setShowAddSchedule(false)}
          onSave={saveSchedule}
        />
      </Modal>

      <Modal visible={!!editingSchedule} transparent animationType="fade">
        {editingSchedule && (
          <EditScheduleModal
            schedule={editingSchedule}
            onCancel={() => setEditingSchedule(null)}
            onSave={(name, start, end) => updateScheduleMeta(editingSchedule.id, name, start, end)}
            onDelete={() => deleteSchedule(editingSchedule.id)}
          />
        )}
      </Modal>

      <Modal visible={showAddCategory} transparent animationType="fade">
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onSave={(name, color) => {
            addCategory(name, color);
            setShowAddCategory(false);
          }}
        />
      </Modal>

      <Modal visible={showManageSubjects} animationType="slide">
        {activeSchedule && (
          <ManageSubjectsScreen
            schedule={activeSchedule}
            categories={categories}
            onAddCategory={addCategory}
            onClose={() => setShowManageSubjects(false)}
            onUpdateSubjects={(subjects) => updateScheduleSubjects(activeSchedule.id, subjects)}
          />
        )}
      </Modal>

      <Modal visible={showAddNote} transparent animationType="fade">
        <AddNoteModal onCancel={() => setShowAddNote(false)} onSave={addNote} />
      </Modal>
    </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function HomeScreen({ onOpen }) {
  return (
    <ScrollView contentContainerStyle={styles.homeContainer}>
      <View style={styles.logoWrap}>
        <Text style={styles.logoText}>سنفور</Text>
      </View>

      <View style={{ height: 36 }} />

      <TouchableOpacity style={styles.branchCard} onPress={() => onOpen('scheduleList')}>
        <Text style={styles.branchIcon}>📅</Text>
        <Text style={styles.branchTitle}>الجدول</Text>
        <Text style={styles.branchSub}>جدولك الأسبوعي للمحاضرات</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.branchCard} onPress={() => onOpen('notesList')}>
        <Text style={styles.branchIcon}>📝</Text>
        <Text style={styles.branchTitle}>النوتس</Text>
        <Text style={styles.branchSub}>دوّن ملاحظاتك لكل محاضرة</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.branchCard} onPress={() => onOpen('photosGrid')}>
        <Text style={styles.branchIcon}>🖼️</Text>
        <Text style={styles.branchTitle}>الصور</Text>
        <Text style={styles.branchSub}>معرض صور للاطلاع</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function ScheduleListScreen({ schedules, activeScheduleId, onSelect, onEdit, onAddSchedule, onAddCategory }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity style={styles.addBtn} onPress={onAddSchedule}>
        <Text style={styles.addBtnText}>+ إضافة جدول</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.addCategoryBtn} onPress={onAddCategory}>
        <Text style={styles.addCategoryText}>+ إضافة تصنيف</Text>
      </TouchableOpacity>

      <ScrollView style={{ marginTop: 10 }}>
        {schedules.map((s) => (
          <View key={s.id} style={styles.scheduleRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelect(s.id)}>
              <Text
                style={[
                  styles.scheduleRowText,
                  s.id === activeScheduleId && { color: ACCENT, fontWeight: '700' },
                ]}
              >
                {s.name}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onEdit(s)}>
              <Text style={styles.editIcon}>✎</Text>
            </TouchableOpacity>
          </View>
        ))}
        {schedules.length === 0 && <Text style={styles.noSchedules}>لا توجد جداول بعد</Text>}
      </ScrollView>
    </View>
  );
}

function ScheduleView({ schedule, categories }) {
  const dayGroups = DAYS.map((dayName, idx) => {
    const subjects = schedule.subjects.filter((sub) => sub.days.includes(idx));
    return { dayName, idx, subjects };
  }).filter((g) => g.subjects.length > 0);

  return (
    <ScrollView style={styles.scheduleContainer} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {schedule.startDate ? (
        <Text style={styles.rangeText}>
          من {schedule.startDate} إلى {schedule.endDate || '∞'}
        </Text>
      ) : null}

      {dayGroups.length === 0 && <Text style={styles.emptyText}>لا توجد مواد في هذا الجدول بعد</Text>}

      {dayGroups.map((g) => (
        <View key={g.idx} style={styles.dayBlock}>
          <View style={styles.dayHeader}>
            <Text style={styles.dayName}>{g.dayName}</Text>
            <Text style={styles.dayDate}>{nextDateForDay(schedule.startDate, g.idx)}</Text>
          </View>
          {g.subjects
            .sort((a, b) => a.start.localeCompare(b.start))
            .map((sub) => {
              const cat = categories.find((c) => c.id === sub.categoryId);
              const bg = cat ? lightenColor(cat.color) : CARD_BG;
              const barColor = cat ? cat.color : BORDER;
              return (
                <View key={sub.id + '-' + g.idx} style={[styles.subjectCard, { backgroundColor: bg }]}>
                  <View style={[styles.subjectBar, { backgroundColor: barColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectName}>{sub.name}</Text>
                    <Text style={styles.subjectTime}>
                      {sub.start} - {sub.end}
                      {'  ·  '}
                      {sub.mode === 'online' ? '💻 أونلاين' : '🏫 وجاهي'}
                      {cat ? `  ·  ${cat.name}` : ''}
                    </Text>
                  </View>
                </View>
              );
            })}
        </View>
      ))}
    </ScrollView>
  );
}

function ManageSubjectsScreen({ schedule, categories, onAddCategory, onClose, onUpdateSubjects }) {
  const [subjects, setSubjects] = useState(schedule.subjects);
  const [editingSubject, setEditingSubject] = useState(null);
  const [showAddSubject, setShowAddSubject] = useState(false);

  function persist(newSubjects) {
    setSubjects(newSubjects);
    onUpdateSubjects(newSubjects);
  }
  function removeSubject(id) {
    persist(subjects.filter((s) => s.id !== id));
  }
  function upsertSubject(subject) {
    const exists = subjects.find((s) => s.id === subject.id);
    const newList = exists ? subjects.map((s) => (s.id === subject.id ? subject : s)) : [...subjects, subject];
    persist(newList);
    setEditingSubject(null);
    setShowAddSubject(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>مواد {schedule.name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={styles.label}>المواد الأسبوعية ({subjects.length})</Text>

        {subjects.map((s) => {
          const cat = categories.find((c) => c.id === s.categoryId);
          return (
            <View key={s.id} style={styles.manageSubjectRow}>
              <View style={[styles.catDot, { backgroundColor: cat ? cat.color : BORDER }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.subjectName}>{s.name}</Text>
                <Text style={styles.subjectTime}>
                  {s.days.map((d) => DAYS[d]).join('، ')} · {s.start}-{s.end} ·{' '}
                  {s.mode === 'online' ? 'أونلاين' : 'وجاهي'}
                  {cat ? ` · ${cat.name}` : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingSubject(s)} style={{ padding: 6 }}>
                <Text style={{ color: ACCENT, fontSize: 17 }}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeSubject(s.id)} style={{ padding: 6 }}>
                <Text style={{ color: TEXT_LIGHT, fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        {subjects.length === 0 && <Text style={styles.noSchedules}>لا توجد مواد بعد</Text>}

        <TouchableOpacity style={styles.addSubjectBtn} onPress={() => setShowAddSubject(true)}>
          <Text style={styles.addSubjectBtnText}>+ إضافة مادة</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={!!editingSubject} transparent animationType="fade">
        {editingSubject && (
          <AddSubjectModal
            categories={categories}
            onAddCategory={onAddCategory}
            initial={editingSubject}
            onCancel={() => setEditingSubject(null)}
            onSave={upsertSubject}
          />
        )}
      </Modal>
      <Modal visible={showAddSubject} transparent animationType="fade">
        <AddSubjectModal
          categories={categories}
          onAddCategory={onAddCategory}
          onCancel={() => setShowAddSubject(false)}
          onSave={upsertSubject}
        />
      </Modal>
    </SafeAreaView>
  );
}

function AddScheduleScreen({ categories, onAddCategory, onCancel, onSave }) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  function removeSubject(id) {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
  }
  function upsertSubject(subject) {
    setSubjects((prev) => {
      const exists = prev.find((s) => s.id === subject.id);
      return exists ? prev.map((s) => (s.id === subject.id ? subject : s)) : [...prev, subject];
    });
    setEditingSubject(null);
    setShowAddSubject(false);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 18 }}>
        <Text style={styles.screenTitle}>جدول جديد</Text>

        <Text style={styles.label}>اسم الجدول</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="مثال: الفصل الأول"
          placeholderTextColor={TEXT_LIGHT}
        />

        <View style={styles.rowBetween}>
          <View style={{ flex: 1, marginEnd: 8 }}>
            <Text style={styles.label}>تاريخ البداية</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={TEXT_LIGHT}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>تاريخ النهاية</Text>
            <TextInput
              style={styles.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={TEXT_LIGHT}
            />
          </View>
        </View>

        <Text style={[styles.label, { marginTop: 18 }]}>المواد</Text>
        {subjects.map((s) => {
          const cat = categories.find((c) => c.id === s.categoryId);
          return (
            <View key={s.id} style={styles.subjectPreviewRow}>
              <View style={[styles.catDot, { backgroundColor: cat ? cat.color : BORDER }]} />
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingSubject(s)}>
                <Text style={{ color: TEXT_DARK }}>
                  {s.name} · {s.days.map((d) => DAYS[d]).join('، ')} · {s.start}-{s.end} ·{' '}
                  {s.mode === 'online' ? 'أونلاين' : 'وجاهي'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingSubject(s)}>
                <Text style={{ color: ACCENT, fontSize: 16, paddingHorizontal: 6 }}>✎</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeSubject(s.id)}>
                <Text style={{ color: TEXT_LIGHT, fontSize: 18 }}>×</Text>
              </TouchableOpacity>
            </View>
          );
        })}

        <TouchableOpacity style={styles.addSubjectBtn} onPress={() => setShowAddSubject(true)}>
          <Text style={styles.addSubjectBtnText}>+ إضافة مادة</Text>
        </TouchableOpacity>

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              if (!name.trim()) return;
              onSave({ id: uid(), name, startDate, endDate, subjects });
            }}
          >
            <Text style={styles.saveBtnText}>حفظ الجدول</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={showAddSubject} transparent animationType="fade">
        <AddSubjectModal
          categories={categories}
          onAddCategory={onAddCategory}
          onCancel={() => setShowAddSubject(false)}
          onSave={upsertSubject}
        />
      </Modal>
      <Modal visible={!!editingSubject} transparent animationType="fade">
        {editingSubject && (
          <AddSubjectModal
            categories={categories}
            onAddCategory={onAddCategory}
            initial={editingSubject}
            onCancel={() => setEditingSubject(null)}
            onSave={upsertSubject}
          />
        )}
      </Modal>
    </SafeAreaView>
  );
}

function AddSubjectModal({ categories, onAddCategory, onCancel, onSave, initial }) {
  const isEdit = !!initial;
  const [name, setName] = useState(initial ? initial.name : '');
  const [selectedDays, setSelectedDays] = useState(initial ? initial.days : []);
  const [start, setStart] = useState(initial ? initial.start : '');
  const [end, setEnd] = useState(initial ? initial.end : '');
  const [categoryId, setCategoryId] = useState(initial ? initial.categoryId : null);
  const [mode, setMode] = useState(initial ? initial.mode || 'in-person' : 'in-person');
  const [showInlineAddCategory, setShowInlineAddCategory] = useState(false);

  function toggleDay(idx) {
    setSelectedDays((prev) => (prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]));
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <ScrollView>
          <Text style={styles.screenTitle}>{isEdit ? 'تعديل المادة' : 'مادة جديدة'}</Text>

          <Text style={styles.label}>اسم المادة</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="مثال: رياضيات ١"
            placeholderTextColor={TEXT_LIGHT}
          />

          <Text style={styles.label}>الأيام</Text>
          <View style={styles.daysWrap}>
            {DAYS.map((d, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => toggleDay(idx)}
                style={[styles.dayChip, selectedDays.includes(idx) && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, selectedDays.includes(idx) && styles.dayChipTextActive]}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.rowBetween}>
            <View style={{ flex: 1, marginEnd: 8 }}>
              <Text style={styles.label}>من الساعة</Text>
              <TextInput
                style={styles.input}
                value={start}
                onChangeText={setStart}
                placeholder="09:00"
                placeholderTextColor={TEXT_LIGHT}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>إلى الساعة</Text>
              <TextInput
                style={styles.input}
                value={end}
                onChangeText={setEnd}
                placeholder="10:30"
                placeholderTextColor={TEXT_LIGHT}
              />
            </View>
          </View>

          <Text style={styles.label}>نوع المحاضرة</Text>
          <View style={styles.daysWrap}>
            <TouchableOpacity
              onPress={() => setMode('in-person')}
              style={[styles.dayChip, mode === 'in-person' && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, mode === 'in-person' && styles.dayChipTextActive]}>🏫 وجاهي</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('online')}
              style={[styles.dayChip, mode === 'online' && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, mode === 'online' && styles.dayChipTextActive]}>💻 أونلاين</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>التصنيف (اختياري)</Text>
          <View style={styles.daysWrap}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                style={[styles.catChip, { borderColor: c.color }, categoryId === c.id && { backgroundColor: c.color }]}
              >
                <Text style={{ color: categoryId === c.id ? '#fff' : TEXT_DARK }}>{c.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.catChipAdd} onPress={() => setShowInlineAddCategory(true)}>
              <Text style={{ color: ACCENT }}>+ تصنيف جديد</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.rowBetween}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelBtnText}>إلغاء</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                if (!name.trim() || selectedDays.length === 0 || !start || !end) return;
                onSave({ id: initial ? initial.id : uid(), name, days: selectedDays, start, end, categoryId, mode });
              }}
            >
              <Text style={styles.saveBtnText}>{isEdit ? 'حفظ التعديل' : 'إضافة'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <Modal visible={showInlineAddCategory} transparent animationType="fade">
        <AddCategoryModal
          onCancel={() => setShowInlineAddCategory(false)}
          onSave={(n, c) => {
            onAddCategory(n, c);
            setShowInlineAddCategory(false);
          }}
        />
      </Modal>
    </View>
  );
}

function AddCategoryModal({ onCancel, onSave }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(CATEGORY_COLORS[0]);

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.screenTitle}>تصنيف جديد</Text>
        <Text style={styles.label}>الاسم</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="مثال: رياضيات"
          placeholderTextColor={TEXT_LIGHT}
        />
        <Text style={styles.label}>اللون</Text>
        <View style={styles.colorWrap}>
          {CATEGORY_COLORS.map((c) => (
            <TouchableOpacity
              key={c}
              onPress={() => setColor(c)}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
            />
          ))}
          <TouchableOpacity
            onPress={() => setColor('#8E6BBF')}
            style={[styles.colorDot, styles.gradientDot, color === '#8E6BBF' && styles.colorDotActive]}
          />
        </View>
        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              if (!name.trim()) return;
              onSave(name, color);
            }}
          >
            <Text style={styles.saveBtnText}>حفظ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function EditScheduleModal({ schedule, onCancel, onSave, onDelete }) {
  const [name, setName] = useState(schedule.name);
  const [startDate, setStartDate] = useState(schedule.startDate || '');
  const [endDate, setEndDate] = useState(schedule.endDate || '');

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.screenTitle}>تعديل الجدول</Text>
        <Text style={styles.label}>اسم الجدول</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholderTextColor={TEXT_LIGHT} />
        <Text style={styles.label}>تاريخ البداية</Text>
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={TEXT_LIGHT}
        />
        <Text style={styles.label}>تاريخ النهاية</Text>
        <TextInput
          style={styles.input}
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={TEXT_LIGHT}
        />

        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              if (!name.trim()) return;
              onSave(name, startDate, endDate);
            }}
          >
            <Text style={styles.saveBtnText}>حفظ</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() =>
            Alert.alert('حذف الجدول', `هل أنت متأكد من حذف "${schedule.name}"؟`, [
              { text: 'إلغاء', style: 'cancel' },
              { text: 'حذف', style: 'destructive', onPress: onDelete },
            ])
          }
        >
          <Text style={styles.deleteBtnText}>حذف الجدول</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function NotesListScreen({ notes, onSelect, onAdd, onDelete }) {
  return (
    <View style={{ flex: 1, padding: 16 }}>
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Text style={styles.addBtnText}>+ إضافة محاضرة / موضوع</Text>
      </TouchableOpacity>

      <ScrollView style={{ marginTop: 10 }}>
        {notes.map((n) => (
          <View key={n.id} style={styles.scheduleRow}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onSelect(n.id)}>
              <Text style={styles.scheduleRowText}>{n.title}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onDelete(n.id)}>
              <Text style={styles.editIcon}>×</Text>
            </TouchableOpacity>
          </View>
        ))}
        {notes.length === 0 && <Text style={styles.noSchedules}>لا توجد محاضرات بعد</Text>}
      </ScrollView>
    </View>
  );
}

function AddNoteModal({ onCancel, onSave }) {
  const [title, setTitle] = useState('');
  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.screenTitle}>محاضرة / موضوع جديد</Text>
        <Text style={styles.label}>الاسم</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="مثال: محاضرة ١ - مقدمة"
          placeholderTextColor={TEXT_LIGHT}
        />
        <View style={styles.rowBetween}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>إلغاء</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.saveBtn}
            onPress={() => {
              if (!title.trim()) return;
              onSave(title);
            }}
          >
            <Text style={styles.saveBtnText}>إضافة</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function NoteEditorScreen({ note, onChangeBlocks }) {
  const [blocks, setBlocks] = useState(note.blocks);

  useEffect(() => {
    setBlocks(note.blocks);
  }, [note.id]);

  function persist(newBlocks) {
    setBlocks(newBlocks);
    onChangeBlocks(newBlocks);
  }

  function updateTextBlock(id, text) {
    persist(blocks.map((b) => (b.id === id ? { ...b, text } : b)));
  }

  function moveBlock(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= blocks.length) return;
    const newBlocks = [...blocks];
    const tmp = newBlocks[index];
    newBlocks[index] = newBlocks[newIndex];
    newBlocks[newIndex] = tmp;
    persist(newBlocks);
  }

  function removeImageBlock(id) {
    persist(blocks.filter((b) => b.id !== id));
  }

  async function addImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('يحتاج صلاحية', 'يرجى السماح بالوصول للصور من إعدادات الهاتف.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (!result.canceled) {
      const newBlocks = [
        ...blocks,
        { id: uid(), type: 'image', uri: result.assets[0].uri },
        { id: uid(), type: 'text', text: '' },
      ];
      persist(newBlocks);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {blocks.map((b, idx) =>
          b.type === 'text' ? (
            <TextInput
              key={b.id}
              style={styles.noteTextInput}
              value={b.text}
              onChangeText={(t) => updateTextBlock(b.id, t)}
              placeholder="اكتب هنا..."
              placeholderTextColor={TEXT_LIGHT}
              multiline
              textAlignVertical="top"
            />
          ) : (
            <View key={b.id} style={styles.imageBlockWrap}>
              <Image source={{ uri: b.uri }} style={styles.noteImage} resizeMode="contain" />
              <View style={styles.imageControls}>
                <TouchableOpacity onPress={() => moveBlock(idx, -1)} style={styles.imageCtrlBtn}>
                  <Text style={styles.imageCtrlText}>▲</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => moveBlock(idx, 1)} style={styles.imageCtrlBtn}>
                  <Text style={styles.imageCtrlText}>▼</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeImageBlock(b.id)} style={styles.imageCtrlBtn}>
                  <Text style={[styles.imageCtrlText, { color: ACCENT }]}>×</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        )}

        <TouchableOpacity style={styles.addSubjectBtn} onPress={addImage}>
          <Text style={styles.addSubjectBtnText}>+ إضافة صورة</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function PhotosGridScreen({ photos, onAdd, onDelete }) {
  const [preview, setPreview] = useState(null);
  const itemSize = (SCREEN_WIDTH - 16 * 2 - 10) / 2;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    scale.setValue(1);
  }, [preview]);

  const onPinchEvent = Animated.event([{ nativeEvent: { scale } }], { useNativeDriver: true });
  function onPinchStateChange(event) {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addBtnText}>+ إضافة صور</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.photoGrid}>
        {photos.map((p) => (
          <TouchableOpacity key={p.id} onPress={() => setPreview(p)} style={{ width: itemSize, height: itemSize, margin: 5 }}>
            <Image source={{ uri: p.uri }} style={styles.photoThumb} resizeMode="cover" />
            <TouchableOpacity style={styles.photoDeleteBadge} onPress={() => onDelete(p.id)}>
              <Text style={{ color: '#fff', fontSize: 12 }}>×</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
        {photos.length === 0 && <Text style={[styles.noSchedules, { width: '100%' }]}>لا توجد صور بعد</Text>}
      </ScrollView>

      <Modal visible={!!preview} transparent animationType="fade">
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity style={styles.previewBackBtn} onPress={() => setPreview(null)}>
            <Text style={styles.previewBackIcon}>←</Text>
          </TouchableOpacity>
          {preview && (
            <PinchGestureHandler onGestureEvent={onPinchEvent} onHandlerStateChange={onPinchStateChange}>
              <Animated.Image
                source={{ uri: preview.uri }}
                style={[styles.photoPreviewImage, { transform: [{ scale }] }]}
                resizeMode="contain"
              />
            </PinchGestureHandler>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: APP_BG },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  menuBtn: { padding: 6, width: 40 },
  menuIcon: { fontSize: 26, color: TEXT_DARK },
  editHeaderIcon: { fontSize: 18, color: ACCENT, textAlign: 'right' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backBtn: { paddingHorizontal: 8 },
  backIcon: { fontSize: 20, color: TEXT_DARK },
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },

  homeContainer: { padding: 20, paddingTop: 10 },
  logoWrap: { alignItems: 'center', paddingVertical: 6 },
  logoText: { fontSize: 40, fontWeight: '800', color: LOGO_COLOR, letterSpacing: 1 },

  branchCard: {
    width: '100%',
    minHeight: 130,
    backgroundColor: CARD_BG,
    borderRadius: 18,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
  },
  branchIcon: { fontSize: 32, marginBottom: 6 },
  branchTitle: { fontSize: 19, fontWeight: '700', color: TEXT_DARK },
  branchSub: { fontSize: 13, color: TEXT_LIGHT, marginTop: 4 },

  emptyText: { color: TEXT_LIGHT, fontSize: 15, textAlign: 'center' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)', zIndex: 5 },
  drawer: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: CARD_BG,
    zIndex: 10,
    padding: 16,
    paddingTop: 50,
    borderRightWidth: 1,
    borderRightColor: BORDER,
  },
  drawerTitle: { fontSize: 16, fontWeight: '700', color: TEXT_DARK },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  recentIcon: { marginEnd: 8, fontSize: 15 },
  recentText: { fontSize: 14, color: TEXT_DARK, flex: 1 },

  addBtn: { backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addCategoryBtn: { marginTop: 10, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  addCategoryText: { color: TEXT_DARK, fontWeight: '600' },

  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: BORDER },
  scheduleRowText: { fontSize: 15, color: TEXT_DARK },
  editIcon: { fontSize: 16, color: TEXT_LIGHT, paddingHorizontal: 8 },
  noSchedules: { color: TEXT_LIGHT, marginTop: 20, textAlign: 'center' },

  scheduleContainer: { flex: 1 },
  rangeText: { color: TEXT_LIGHT, marginBottom: 14, fontSize: 13 },
  dayBlock: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayName: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },
  dayDate: { fontSize: 13, color: TEXT_LIGHT },
  subjectCard: { flexDirection: 'row', borderRadius: 12, padding: 12, marginBottom: 8, alignItems: 'center' },
  subjectBar: { width: 4, height: 32, borderRadius: 2, marginEnd: 10 },
  subjectName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  subjectTime: { fontSize: 13, color: TEXT_LIGHT, marginTop: 2 },

  manageSubjectRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: BORDER },

  screenTitle: { fontSize: 20, fontWeight: '700', color: TEXT_DARK, marginBottom: 16 },
  label: { fontSize: 13, color: TEXT_LIGHT, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_DARK,
    fontSize: 15,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 18 },

  subjectPreviewRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: BORDER },
  catDot: { width: 10, height: 10, borderRadius: 5, marginEnd: 8 },

  addSubjectBtn: {
    marginTop: 14,
    borderWidth: 1,
    borderColor: ACCENT,
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addSubjectBtnText: { color: ACCENT, fontWeight: '600' },

  cancelBtn: { flex: 1, marginEnd: 8, borderWidth: 1, borderColor: BORDER, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: TEXT_DARK, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: ACCENT, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  deleteBtn: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  deleteBtnText: { color: '#C0392B', fontWeight: '700' },

  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayChip: { borderWidth: 1, borderColor: BORDER, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginEnd: 6, marginBottom: 6 },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { color: TEXT_DARK, fontSize: 13 },
  dayChipTextActive: { color: '#fff' },

  catChip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginEnd: 6, marginBottom: 6 },
  catChipAdd: { borderWidth: 1, borderColor: BORDER, borderStyle: 'dashed', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 6 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: CARD_BG, borderRadius: 16, padding: 18, maxHeight: '85%' },
  colorWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginEnd: 10, marginBottom: 10 },
  colorDotActive: { borderWidth: 3, borderColor: TEXT_DARK },
  gradientDot: { backgroundColor: '#8E6BBF' },

  noteTextInput: {
    fontSize: 16,
    color: TEXT_DARK,
    minHeight: 50,
    textAlign: 'right',
    marginBottom: 6,
  },
  imageBlockWrap: { alignItems: 'center', marginVertical: 10 },
  noteImage: { width: '100%', height: 220, alignSelf: 'center' },
  imageControls: { flexDirection: 'row', marginTop: 6 },
  imageCtrlBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: CARD_BG,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  imageCtrlText: { fontSize: 14, color: TEXT_DARK },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 11 },
  photoThumb: { width: '100%', height: '100%', borderRadius: 12 },
  photoDeleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(245,240,232,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreviewImage: { width: '88%', height: '60%' },
  previewBackBtn: {
    position: 'absolute',
    top: 50,
    left: 20,
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: CARD_BG,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    zIndex: 5,
  },
  previewBackIcon: { fontSize: 20, color: TEXT_DARK },
});
            
