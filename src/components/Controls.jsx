import React from 'react';
import { Settings } from 'lucide-react';

const Controls = ({ settings, onSettingsChange }) => {
    const handleChange = (key, value) => {
        onSettingsChange({ ...settings, [key]: parseFloat(value) });
    };

    return (
        <div style={{
            padding: '20px',
            background: '#111',
            borderLeft: '1px solid #333',
            width: '300px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: 'white',
            overflowY: 'auto',
            maxHeight: '100vh',
            boxSizing: 'border-box'
        }} className="controls-panel">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
				<button class="add-btn" onclick="openIcsForIphone()">
					<Settings size={20} />
				</button>
				<script>
					function openIcsForIphone() {
						// 1. 登録したい予定の情報（ここを可変にする）
						const event = {
							title: "打ち合わせ（可変タイトル）",
							location: "Zoom会議室",
							description: "当日の資料はチャットでお送りします。",
							start: new Date("2026-05-01T10:00:00"), // 開始日時
							end: new Date("2026-05-01T11:00:00")    // 終了日時
						};

						// 2. 日時を .ics 用のフォーマット (YYYYMMDDTHHmmSSZ) に変換する関数
						const formatIcsDate = (date) => {
							return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
						};

						// 3. iCalendar形式のテキストを作成（CRLF改行が必須）
						const icsLines = [
							"BEGIN:VCALENDAR",
							"VERSION:2.0",
							"PRODID:-//My App//Calendar Event//JP",
							"BEGIN:VEVENT",
							`SUMMARY:${event.title}`,
							`DTSTART:${formatIcsDate(event.start)}`,
							`DTEND:${formatIcsDate(event.end)}`,
							`LOCATION:${event.location}`,
							`DESCRIPTION:${event.description}`,
							"END:VEVENT",
							"END:VCALENDAR"
						];
						const icsString = icsLines.join("\r\n");

						// 4. Blob（仮想ファイル）を作成
						const blob = new Blob([icsString], { type: "text/calendar;charset=utf-8" });
						
						// 5. Blob URLを生成して、window.location.href で開く
						const blobUrl = URL.createObjectURL(blob);
						window.location.href = blobUrl;

						// 6. (オプション) メモリ解放のために少し遅れてURLを破棄
						setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
					}
				</script>
                <h2 style={{ margin: 0, fontSize: '1.2rem' }}>設定</h2>
            </div>

            <div className="control-group">
                <label>揺れの強さ (Jitter Amount): {settings.jitterAmount}</label>
                <input
                    type="range"
                    min="0"
                    max="20"
                    step="0.5"
                    value={settings.jitterAmount}
                    onChange={(e) => handleChange('jitterAmount', e.target.value)}
                />
            </div>

            <div className="control-group">
                <label>揺れの速さ (Jitter Speed): {settings.jitterSpeed} fps</label>
                <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={settings.jitterSpeed}
                    onChange={(e) => handleChange('jitterSpeed', e.target.value)}
                />
            </div>

            <div className="control-group">
                <label>エッジ検出 しきい値1: {settings.threshold1}</label>
                <input
                    type="range"
                    min="0"
                    max="255"
                    value={settings.threshold1}
                    onChange={(e) => handleChange('threshold1', e.target.value)}
                />
            </div>

            <div className="control-group">
                <label>エッジ検出 しきい値2: {settings.threshold2}</label>
                <input
                    type="range"
                    min="0"
                    max="255"
                    value={settings.threshold2}
                    onChange={(e) => handleChange('threshold2', e.target.value)}
                />
            </div>

            <div className="control-group">
                <label>線の単純化 (Simplification): {settings.epsilonFactor}</label>
                <input
                    type="range"
                    min="0.001"
                    max="0.05"
                    step="0.001"
                    value={settings.epsilonFactor}
                    onChange={(e) => handleChange('epsilonFactor', e.target.value)}
                />
            </div>



            <style>{`
        .control-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        input[type=range] {
          width: 100%;
          accent-color: white;
        }
      `}</style>
        </div>
    );
};

export default Controls;
