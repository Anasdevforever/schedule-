import React, { useState } from 'react';
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
} from 'react-native';

// ---------- الألوان العامة للتطبيق (بيج هادئ قريب من كلود) ----------
const APP_BG = '#F5F0E8';
const CARD_BG = '#FFFFFF';
const TEXT_DARK = '#3D3929';
const TEXT_LIGHT = '#8A8372';
const ACCENT = '#C96442'; // لون تمييز دافئ يتماشى مع البيج
const BORDER = '#E8E0D4';

// ---------- ألوان جاهزة وعصرية لاختيار التصنيفات ----------
const CATEGORY_COLORS = [
  '#E07A5F', '#81B29A', '#F2CC8F', '#3D5A80',
  '#9381FF', '#F4978E', '#6D9DC5', '#B5838D',
  '#52796F', '#E9C46A',
];

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

const DRAWER_WIDTH = Dimensions.get('window').width * 0.78;

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// يحسب أقرب تاريخ قادم ليوم أسبوع معيّن انطلاقاً من تاريخ البداية
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
  // يمزج اللون مع الخلفية البيج لإعطاء توازن ووضوح
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
  const [activeScheduleId, setActiveScheduleId] = useState(null);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useState(new Animated.Value(-DRAWER_WIDTH))[0];

  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null); // لتعديل التواريخ فقط
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showManageSubjects, setShowManageSubjects] = useState(false);

  function openDrawer() {
    setDrawerOpen(true);
    Animated.timing(drawerAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
  }
  function closeDrawer() {
    Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: false }).start(() =>
      setDrawerOpen(false)
    );
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
    setActiveScheduleId(schedule.id);
    setShowAddSchedule(false);
    closeDrawer();
  }

  function updateScheduleDates(id, startDate, endDate) {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, startDate, endDate } : s)));
    setEditingSchedule(null);
  }

  function updateScheduleSubjects(id, subjects) {
    setSchedules((prev) => prev.map((s) => (s.id === id ? { ...s, subjects } : s)));
  }

  const activeSchedule = schedules.find((s) => s.id === activeScheduleId);

  return (
    <SafeAreaView style={styles.safe}>
      {/* الهيدر */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuBtn}>
          <Text style={styles.menuIcon}>≡</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{activeSchedule ? activeSchedule.name : 'جدولي'}</Text>
        {activeSchedule ? (
          <TouchableOpacity style={styles.menuBtn} onPress={() => setShowManageSubjects(true)}>
            <Text style={styles.editHeaderIcon}>✎</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* الشاشة الرئيسية: عرض الجدول المختار (أسبوعي متكرر) */}
      {activeSchedule ? (
        <ScheduleView schedule={activeSchedule} categories={categories} />
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>افتح القائمة من الأعلى وأضف جدولك الأول</Text>
        </View>
      )}

      {/* الدرور */}
      {drawerOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeDrawer} />
      )}
      <Animated.View style={[styles.drawer, { left: drawerAnim }]}>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => {
            setEditingSchedule(null);
            setShowAddSchedule(true);
          }}
        >
          <Text style={styles.addBtnText}>+ إضافة جدول</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.addCategoryBtn} onPress={() => setShowAddCategory(true)}>
          <Text style={styles.addCategoryText}>+ إضافة تصنيف</Text>
        </TouchableOpacity>

        <ScrollView style={{ marginTop: 10 }}>
          {schedules.map((s) => (
            <View key={s.id} style={styles.scheduleRow}>
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => {
                  setActiveScheduleId(s.id);
                  closeDrawer();
                }}
              >
                <Text
                  style={[
                    styles.scheduleRowText,
                    s.id === activeScheduleId && { color: ACCENT, fontWeight: '700' },
                  ]}
                >
                  {s.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setEditingSchedule(s)}>
                <Text style={styles.editIcon}>✎</Text>
              </TouchableOpacity>
            </View>
          ))}
          {schedules.length === 0 && (
            <Text style={styles.noSchedules}>لا توجد جداول بعد</Text>
          )}
        </ScrollView>
      </Animated.View>

      {/* مودال إضافة جدول */}
      <Modal visible={showAddSchedule} animationType="slide">
        <AddScheduleScreen
          categories={categories}
          onAddCategory={addCategory}
          onCancel={() => setShowAddSchedule(false)}
onSave={saveSchedule}
        />
      </Modal>

      {/* مودال تعديل تاريخ جدول موجود */}
      <Modal visible={!!editingSchedule} transparent animationType="fade">
        {editingSchedule && (
          <EditDatesModal
            schedule={editingSchedule}
            onCancel={() => setEditingSchedule(null)}
            onSave={(start, end) => updateScheduleDates(editingSchedule.id, start, end)}
          />
        )}
      </Modal>

      {/* مودال إضافة تصنيف مستقل من الدرور */}
      <Modal visible={showAddCategory} transparent animationType="fade">
        <AddCategoryModal
          onCancel={() => setShowAddCategory(false)}
          onSave={(name, color) => {
            addCategory(name, color);
            setShowAddCategory(false);
          }}
        />
      </Modal>

      {/* شاشة إدارة مواد جدول موجود: قائمة مسطّحة واحدة لكل مادة + تعديل/حذف */}
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
    </SafeAreaView>
  );
}

// ---------------- عرض الجدول الأسبوعي (الشاشة الرئيسية عند اختيار جدول) ----------------
function ScheduleView({ schedule, categories }) {
  const dayGroups = DAYS.map((dayName, idx) => {
    const subjects = schedule.subjects.filter((sub) => sub.days.includes(idx));
    return { dayName, idx, subjects };
  }).filter((g) => g.subjects.length > 0);

  return (
    <ScrollView style={styles.scheduleContainer} contentContainerStyle={{ paddingBottom: 40 }}>
      {schedule.startDate ? (
        <Text style={styles.rangeText}>
          من {schedule.startDate} إلى {schedule.endDate || '∞'}
        </Text>
      ) : null}

      {dayGroups.length === 0 && (
        <Text style={styles.emptyText}>لا توجد مواد في هذا الجدول بعد</Text>
      )}

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

// ---------------- شاشة إدارة المواد: قائمة مسطّحة (كل مادة مرة واحدة فقط) ----------------
function ManageSubjectsScreen({ schedule, categories, onAddCategory, onClose, onUpdateSubjects }) {
  const [subjects, setSubjects] = useState(schedule.subjects);
  const [editingSubject, setEditingSubject] = useState(null); // null = لا يوجد تعديل مفتوح
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
    const newList = exists
      ? subjects.map((s) => (s.id === subject.id ? subject : s))
      : [...subjects, subject];
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

      {/* تعديل مادة موجودة */}
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

      {/* إضافة مادة جديدة لجدول موجود */}
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

// ---------------- شاشة إضافة جدول كامل ----------------
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

// ---------------- مودال إضافة / تعديل مادة ----------------
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
                <Text
                  style={[
                    styles.dayChipText,
                    selectedDays.includes(idx) && styles.dayChipTextActive,
                  ]}
                >
                  {d}
                </Text>
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
              <Text style={[styles.dayChipText, mode === 'in-person' && styles.dayChipTextActive]}>
                🏫 وجاهي
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setMode('online')}
              style={[styles.dayChip, mode === 'online' && styles.dayChipActive]}
            >
              <Text style={[styles.dayChipText, mode === 'online' && styles.dayChipTextActive]}>
                💻 أونلاين
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>التصنيف (اختياري)</Text>
          <View style={styles.daysWrap}>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.id}
                onPress={() => setCategoryId(categoryId === c.id ? null : c.id)}
                style={[
                  styles.catChip,
                  { borderColor: c.color },
                  categoryId === c.id && { backgroundColor: c.color },
                ]}
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
                onSave({
                  id: initial ? initial.id : uid(),
                  name,
                  days: selectedDays,
                  start,
                  end,
                  categoryId,
                  mode,
                });
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

// ---------------- مودال إضافة تصنيف (اسم + لون) ----------------
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
              style={[
                styles.colorDot,
                { backgroundColor: c },
                color === c && styles.colorDotActive,
              ]}
            />
          ))}
          {/* دائرة تدرّج كخيار لون إضافي */}
          <TouchableOpacity
            onPress={() => setColor('#8E6BBF')}
            style={[
              styles.colorDot,
              styles.gradientDot,
              color === '#8E6BBF' && styles.colorDotActive,
            ]}
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

// ---------------- مودال تعديل تاريخ جدول موجود ----------------
function EditDatesModal({ schedule, onCancel, onSave }) {
  const [startDate, setStartDate] = useState(schedule.startDate || '');
  const [endDate, setEndDate] = useState(schedule.endDate || '');

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.screenTitle}>تعديل تواريخ {schedule.name}</Text>
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
          <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(startDate, endDate)}>
            <Text style={styles.saveBtnText}>حفظ</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ---------------- الأنماط ----------------
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: TEXT_DARK },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  emptyText: { color: TEXT_LIGHT, fontSize: 15, textAlign: 'center' },

  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 5,
  },
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
  addBtn: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  addCategoryBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addCategoryText: { color: TEXT_DARK, fontWeight: '600' },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  scheduleRowText: { fontSize: 15, color: TEXT_DARK },
  editIcon: { fontSize: 16, color: TEXT_LIGHT, paddingHorizontal: 8 },
  noSchedules: { color: TEXT_LIGHT, marginTop: 20, textAlign: 'center' },

  scheduleContainer: { flex: 1, padding: 16 },
  rangeText: { color: TEXT_LIGHT, marginBottom: 14, fontSize: 13 },
  dayBlock: { marginBottom: 20 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  dayName: { fontSize: 17, fontWeight: '700', color: TEXT_DARK },
  dayDate: { fontSize: 13, color: TEXT_LIGHT },
  subjectCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  subjectBar: { width: 4, height: 32, borderRadius: 2, marginEnd: 10 },
  subjectName: { fontSize: 15, fontWeight: '700', color: TEXT_DARK },
  subjectTime: { fontSize: 13, color: TEXT_LIGHT, marginTop: 2 },

  manageSubjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

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

  subjectPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    },
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

  cancelBtn: {
    flex: 1,
    marginEnd: 8,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: { color: TEXT_DARK, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontWeight: '700' },

  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  dayChip: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginEnd: 6,
    marginBottom: 6,
  },
  dayChipActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  dayChipText: { color: TEXT_DARK, fontSize: 13 },
  dayChipTextActive: { color: '#fff' },

  catChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginEnd: 6,
    marginBottom: 6,
  },
  catChipAdd: {
    borderWidth: 1,
    borderColor: BORDER,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginBottom: 6,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: CARD_BG,
    borderRadius: 16,
    padding: 18,
    maxHeight: '85%',
  },
  colorWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  colorDot: {
    width: 34, height: 34, borderRadius: 17,
    marginEnd: 10, marginBottom: 10,
  },
  colorDotActive: { borderWidth: 3, borderColor: TEXT_DARK },
  gradientDot: {
    backgroundColor: '#8E6BBF',
  },
});
