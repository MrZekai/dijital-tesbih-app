package app.zikirmatik.goals

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.text.Layout
import android.text.StaticLayout
import android.text.TextDirectionHeuristics
import android.text.TextPaint
import android.text.TextUtils
import androidx.core.content.FileProvider
import com.google.android.play.core.review.ReviewInfo
import com.google.android.play.core.review.ReviewManagerFactory
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import java.io.FileOutputStream

class GoalActionsModule : Module() {
  private var reviewInfo: ReviewInfo? = null

  override fun definition() = ModuleDefinition {
    Name("GoalActions")

    AsyncFunction("prepareReview") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(false)
      } else {
        activity.runOnUiThread {
          ReviewManagerFactory.create(activity).requestReviewFlow().addOnCompleteListener { task ->
            reviewInfo = if (task.isSuccessful) task.result else null
            promise.resolve(reviewInfo != null)
          }
        }
      }
    }

    AsyncFunction("launchReview") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.resolve(null)
      } else {
        activity.runOnUiThread {
          val info = reviewInfo
          reviewInfo = null
          if (info == null || !activity.hasWindowFocus() || activity.isFinishing || activity.isDestroyed) {
            promise.resolve(null)
          } else {
            ReviewManagerFactory.create(activity).launchReviewFlow(activity, info)
              .addOnCompleteListener { promise.resolve(null) }
          }
        }
      }
    }

    AsyncFunction("shareGoalCard") { name: String, count: String, appName: String, chooserTitle: String, link: String, promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) {
        promise.reject("NO_ACTIVITY", "Sharing needs an active screen", null)
      } else {
        try {
          val bitmap = Bitmap.createBitmap(1080, 1080, Bitmap.Config.ARGB_8888)
          val canvas = Canvas(bitmap)
          val paint = Paint(Paint.ANTI_ALIAS_FLAG)
          canvas.drawColor(Color.rgb(6, 9, 14))
          paint.color = Color.rgb(18, 37, 32)
          canvas.drawRoundRect(RectF(48f, 48f, 1032f, 1032f), 64f, 64f, paint)
          paint.color = Color.rgb(198, 166, 100)
          canvas.drawRoundRect(RectF(100f, 100f, 980f, 108f), 4f, 4f, paint)

          fun centered(value: String, top: Int, size: Float, color: Int, lines: Int) {
            val textPaint = TextPaint(Paint.ANTI_ALIAS_FLAG).apply {
              textSize = size
              this.color = color
              typeface = android.graphics.Typeface.create("sans-serif-medium", android.graphics.Typeface.NORMAL)
            }
            val layout = StaticLayout.Builder.obtain(value, 0, value.length, textPaint, 840)
              .setAlignment(Layout.Alignment.ALIGN_CENTER)
              .setTextDirection(TextDirectionHeuristics.FIRSTSTRONG_LTR)
              .setMaxLines(lines)
              .setEllipsize(TextUtils.TruncateAt.END)
              .build()
            canvas.save()
            canvas.translate(120f, top.toFloat())
            layout.draw(canvas)
            canvas.restore()
          }
          centered(name, 245, 72f, Color.WHITE, 3)
          centered(count, 550, 170f, Color.rgb(198, 166, 100), 1)
          centered(appName, 860, 55f, Color.WHITE, 2)

          val dir = File(activity.cacheDir, "goal-cards").apply { mkdirs() }
          val file = File(dir, "goal-${System.currentTimeMillis()}.png")
          FileOutputStream(file).use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
          bitmap.recycle()
          val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.goalcard", file)
          val send = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, uri)
            putExtra(Intent.EXTRA_TEXT, link)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
          }
          activity.runOnUiThread {
            try {
              activity.startActivity(Intent.createChooser(send, chooserTitle))
              promise.resolve(null)
            } catch (e: Exception) {
              promise.reject("SHARE_FAILED", e.message, e)
            }
          }
        } catch (e: Exception) {
          promise.reject("CARD_FAILED", e.message, e)
        }
      }
    }
  }
}
